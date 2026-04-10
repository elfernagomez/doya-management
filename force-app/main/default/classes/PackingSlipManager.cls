/**
 * Packing Slip manager. Main functionality involving PackingSlip__c and PackingSlipItem__c objects.
 * @author Fernando Gomez
 * @version 1.0 12/16/2025
 */
public with sharing class PackingSlipManager {

	/**
	 * Gets all Packing Slips for a given Order with their related Packing Slip Items
	 * @param orderId The Order Id
	 * @return List of PackingSlip__c records with related PackingSlipItem__c records
	 */
	@AuraEnabled(cacheable=true)
	public static List<DeliveryGroup__c> getPackingSlipsForOrder(Id orderId) {
		try {
			return [
				SELECT Name,
					AddressLabel__c,
					AddressHtml__c,
					Address__City__s,
					Address__CountryCode__s,
					Address__GeocodeAccuracy__s,
					Address__Latitude__s,
					Address__Longitude__s,
					Address__PostalCode__s,
					Address__StateCode__s,
					Address__Street__s,
					DueDate__c,
					DeliveryType__c,
					LocationType__c,
					Order__c,
					DeliveryCenter__c,
					DeliveryCenter__r.Name,
					(
						SELECT Name,
							Description__c,
							TrackingNumber__c
						FROM PackingSlips__r
						ORDER BY Name
					)
				FROM DeliveryGroup__c
				WHERE Order__c = :orderId
				ORDER BY Name
			];
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

	/**
	 * Gets all Order Products for a given Order
	 * @param orderId The Order Id
	 * @return List of OrderItem records
	 */
	@AuraEnabled(cacheable=true)
	public static List<OrderItem> getOrderProductsForOrder(Id orderId) {
		try {
			return [
				SELECT AvailableQuantity,
					BasePrice__c,
					CreatedDate,
					DeliveryType__c,
					Width__c,
					Height__c,
					Depth__c,
					Description,
					DiscountType__c,
					DiscountAmount__c,
					EndDate,
					ListPrice,
					Notes__c,
					Quantity,
					TotalPrice,
					UnitPrice,
					UnitType__c,
					WorkOrderStatus__c,
					DeliveryGroup__c,
					DeliveryGroup__r.Name,
					DeliveryGroup__r.DueDate__c,
					OrderId,
					PricebookEntryId,
					ParentOrderProduct__c,
					ParentOrderProduct__r.Product2.Name,
					Product2Id,
					Product2.Name,
					Product2.ProductCode,
					Product2.Finish__c,
					Product2.Material__c,
					Product2.Material__r.Name,
					Product2.RecordTypeId,
					Product2.RecordType.DeveloperName
				FROM OrderItem
				WHERE OrderId = :orderId
				ORDER BY OrderItemNumber
			];
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

	/**
	 * Gets a single Packing Slip with its items and available order products
	 * @param packingSlipId The Packing Slip Id
	 * @return Map containing PackingSlip data, items, and available order products
	 */
	@AuraEnabled(cacheable=true)
	public static Map<String, Object> getPackingSlipWithItems(Id packingSlipId) {
		try {
			// Get the packing slip with items
			PackingSlip__c packingSlip = [
				SELECT Id, Name, 
					Description__c, 
					TrackingNumber__c,
					Order__c,
					DeliveryGroup__c,
					DeliveryGroup__r.Name,
					(
						SELECT Id, 
							Name,
							OrderProduct__c,
							OrderProduct__r.AvailableQuantity,
							OrderProduct__r.BasePrice__c,
							OrderProduct__r.CreatedDate,
							OrderProduct__r.DeliveryGroup__c,
							OrderProduct__r.DeliveryType__c,
							OrderProduct__r.Width__c,
							OrderProduct__r.Height__c,
							OrderProduct__r.Depth__c,
							OrderProduct__r.Description,
							OrderProduct__r.DiscountType__c,
							OrderProduct__r.DiscountAmount__c,
							OrderProduct__r.EndDate,
							OrderProduct__r.ListPrice,
							OrderProduct__r.Notes__c,
							OrderProduct__r.Quantity,
							OrderProduct__r.TotalPrice,
							OrderProduct__r.UnitPrice,
							OrderProduct__r.UnitType__c,
							OrderProduct__r.WorkOrderStatus__c,
							OrderProduct__r.OrderId,
							OrderProduct__r.PricebookEntryId,
							OrderProduct__r.ParentOrderProduct__c,
							OrderProduct__r.ParentOrderProduct__r.Product2.Name,
							OrderProduct__r.Product2Id,
							OrderProduct__r.Product2.Name,
							OrderProduct__r.Product2.ProductCode,
							OrderProduct__r.Product2.Finish__c,
							OrderProduct__r.Product2.Material__c,
							OrderProduct__r.Product2.Material__r.Name,
							OrderProduct__r.Product2.RecordTypeId,
							OrderProduct__r.Product2.RecordType.DeveloperName,
							Quantity__c
							// Description__c,
							// Product__c
						FROM PackingSlipItems__r
						ORDER BY CreatedDate
					)
				FROM PackingSlip__c
				WHERE Id = :packingSlipId
				LIMIT 1
			];

			// Get all order products from the same delivery group
			List<OrderItem> orderProducts = [
				SELECT AvailableQuantity,
					BasePrice__c,
					CreatedDate,
					DeliveryGroup__c,
					DeliveryType__c,
					Width__c,
					Height__c,
					Depth__c,
					Description,
					DiscountType__c,
					DiscountAmount__c,
					EndDate,
					ListPrice,
					Notes__c,
					Quantity,
					TotalPrice,
					UnitPrice,
					UnitType__c,
					WorkOrderStatus__c,
					OrderId,
					PricebookEntryId,
					ParentOrderProduct__c,
					ParentOrderProduct__r.Product2.Name,
					Product2Id,
					Product2.Name,
					Product2.ProductCode,
					Product2.Finish__c,
					Product2.Material__c,
					Product2.Material__r.Name,
					Product2.RecordTypeId,
					Product2.RecordType.DeveloperName
				FROM OrderItem
				WHERE DeliveryGroup__c = :packingSlip.DeliveryGroup__c
				ORDER BY OrderItemNumber
			];

			// Build packed quantity baseline from other packing slips in the same delivery group.
			Map<String, Decimal> packedQtyByOrderProductId = new Map<String, Decimal>();
			for (AggregateResult ar : [
				SELECT OrderProduct__c orderProductId, SUM(Quantity__c) totalQty
				FROM PackingSlipItem__c
				WHERE PackingSlip__r.DeliveryGroup__c = :packingSlip.DeliveryGroup__c
					AND PackingSlip__c != :packingSlipId
				GROUP BY OrderProduct__c
			]) {
				Id orderProductId = (Id)ar.get('orderProductId');
				Decimal totalQty = (Decimal)ar.get('totalQty');
				if (orderProductId != null)
					packedQtyByOrderProductId.put(String.valueOf(orderProductId), totalQty == null ? 0 : totalQty);
			}

			return new Map<String, Object>{
				'packingSlip' => packingSlip,
				'orderProducts' => orderProducts,
				'packedQtyByOrderProductId' => packedQtyByOrderProductId
			};
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

	/**
	 * Saves Packing Slip Items
	 * @param packingSlipItems List of PackingSlipItem__c records to save
	 * @param packingSlipItemIdsToDelete List of PackingSlipItem__c Ids to delete
	 * @return List of saved PackingSlipItem__c records
	 */
	@AuraEnabled
	public static List<PackingSlipItem__c> savePackingSlipItems(
		List<PackingSlipItem__c> packingSlipItems,
		List<Id> packingSlipItemIdsToDelete
	) {
		try {
			if (packingSlipItemIdsToDelete != null && !packingSlipItemIdsToDelete.isEmpty()) {
				delete [
					SELECT Id
					FROM PackingSlipItem__c
					WHERE Id IN :packingSlipItemIdsToDelete
				];
			}

			if (packingSlipItems != null && !packingSlipItems.isEmpty()) {
				upsert packingSlipItems;
			}

			return packingSlipItems;
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

	/**
	 * Deletes a Packing Slip by Id
	 * @param packingSlipId The Packing Slip Id
	 */
	@AuraEnabled
	public static void deletePackingSlip(Id packingSlipId) {
		try {
			delete [
				SELECT Id
				FROM PackingSlip__c
				WHERE Id = :packingSlipId
				LIMIT 1
			];
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}
}
