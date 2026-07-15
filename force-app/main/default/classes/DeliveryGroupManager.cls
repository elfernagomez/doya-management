/**
 * Common read/write method involving the Delivery Group object.
 * @author Fernando Gomez
 * @version 1.0 9/15/2024
 */
public with sharing class DeliveryGroupManager {
	/* public DeliveryGroupManager() {

	} */

	/**
	 * @param orderIds
	 * @return Map<Id, List<DeliveryGroup__c>>
	 */
	public static Map<Id, List<DeliveryGroup__c>> getDeliveryGroups(List<Id> orderIds) {
		List<DeliveryGroup__c> groups;
		Map<Id, List<DeliveryGroup__c>> result =
			new Map<Id, List<DeliveryGroup__c>>();

		for (Id orderId : orderIds){
			result.put(orderId, new List<DeliveryGroup__c>());
		}

		groups = [
			SELECT Name,
				AddressLabel__c,
				DeliveryAddressHtml__c,
				PickupAddressHtml__c,
				DeliveryAddress__City__s,
				DeliveryAddress__CountryCode__s,
				DeliveryAddress__GeocodeAccuracy__s,
				DeliveryAddress__Latitude__s,
				DeliveryAddress__Longitude__s,
				DeliveryAddress__PostalCode__s,
				DeliveryAddress__StateCode__s,
				DeliveryAddress__Street__s,
				CreatedDate,
				DueDate__c,
				DeliveryType__c,
				DeliveryLocationType__c,
				PickupLocationType__c,
				Order__c,
				DeliveryCenter__c,
				DeliveryCenter__r.Name,
				PickupCenter__c,
				PickupCenter__r.Name,
				(
					SELECT Name,
						Description__c,
						TrackingNumber__c
					FROM PackingSlips__r
					ORDER BY Name
				),
				(
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
					FROM OrderProducts__r
					ORDER BY CreatedDate
				)
			FROM DeliveryGroup__c
			WHERE Order__c = :orderIds
			ORDER BY DueDate__c ASC NULLS LAST, CreatedDate ASC
		];

		for (DeliveryGroup__c g : groups) {
			result.get(g.Order__c).add(g);
		}

		return result;
	}

	/**
	 * Returns delivery groups (with their order products) for the specified Order Id.
	 * @param orderId Id of the order
	 * @return List<DeliveryGroup__c>
	 */
	@AuraEnabled(cacheable=true)
	public static List<DeliveryGroup__c> getDeliveryGroupsByOrder(Id orderId) {
		try {
			if (orderId == null) {
				return new List<DeliveryGroup__c>();
			}

			return getDeliveryGroups(new List<Id> { orderId }).get(orderId);
		} catch (Exception ex) {
			throw new AuraHandledException(ex.getMessage());
		}
	}


	/**
	 * Returns delivery groups (with their order products) that contain order items
	 * linked to the specified Work Order Id.
	 * @param workOrderId Id of the work order
	 * @return List<DeliveryGroup__c> with OrderProducts__r filtered to the work order
	 */
	@AuraEnabled(cacheable=true)
	public static List<DeliveryGroup__c> getDeliveryGroupsByWorkOrder(Id workOrderId) {
		try {
			if (workOrderId == null) {
				return new List<DeliveryGroup__c>();
			}
			// get linking records to determine delivery groups 
			// and order items to include
			List<OrderItemWorkOrder__c> links = [
				SELECT OrderItem__c, OrderItem__r.DeliveryGroup__c
				FROM OrderItemWorkOrder__c
				WHERE WorkOrder__c = :workOrderId
			];

			if (links.isEmpty()) {
				return new List<DeliveryGroup__c>();
			}

			Set<Id> deliveryGroupIds = new Set<Id>();
			Set<Id> orderItemIds = new Set<Id>();
			for (OrderItemWorkOrder__c l : links) {
				if (l.OrderItem__r.DeliveryGroup__c != null) {
					deliveryGroupIds.add(l.OrderItem__r.DeliveryGroup__c);
				}

				if (l.OrderItem__c != null) {
					orderItemIds.add(l.OrderItem__c);
				}
			}

			if (deliveryGroupIds.isEmpty()) {
				return new List<DeliveryGroup__c>();
			}

			List<DeliveryGroup__c> groups = [
				SELECT Name,
					AddressLabel__c,
					DeliveryAddressHtml__c,
					PickupAddressHtml__c,
					DeliveryAddress__City__s,
					DeliveryAddress__CountryCode__s,
					DeliveryAddress__GeocodeAccuracy__s,
					DeliveryAddress__Latitude__s,
					DeliveryAddress__Longitude__s,
					DeliveryAddress__PostalCode__s,
					DeliveryAddress__StateCode__s,
					DeliveryAddress__Street__s,
					CreatedDate,
					DueDate__c,
					DeliveryType__c,
					DeliveryLocationType__c,
					PickupLocationType__c,
					Order__c,
					DeliveryCenter__c,
					DeliveryCenter__r.Name,
					PickupCenter__c,
					PickupCenter__r.Name,
					(
						SELECT Name,
							Description__c,
							TrackingNumber__c
						FROM PackingSlips__r
						ORDER BY Name
					),
					(
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
						FROM OrderProducts__r
						WHERE Id IN :orderItemIds
						ORDER BY CreatedDate ASC
					)
				FROM DeliveryGroup__c
				WHERE Id IN :deliveryGroupIds
				ORDER BY DueDate__c ASC NULLS LAST, CreatedDate ASC
			];
			return groups;
		} catch (Exception ex) {
			throw new AuraHandledException(ex.getMessage());
		}
	}

	/**
	 * @param newOrders
	 * @param sourceOrders
	 */
	public static void clone(List<Order> newOrders, List<Order> sourceOrders) {
		DeliveryGroupCloneService.cloneOrderDeliveryGroupsAndItems(newOrders, sourceOrders);
	}

	@AuraEnabled
	public static Id clone(Id deliveryGroupId, String newName) {
		DeliveryGroup__c sourceGroup;
		DeliveryGroup__c targetGroup;
		List<OrderItem> newOrderProducts;
		List<OpportunityLineItem> newOpportunityProducts;
		OrderItem targetOrderProduct;
		OpportunityLineItem targetOpportunityProduct;

		try {
			sourceGroup = [
				SELECT DeliveryAddress__City__s,
					DeliveryAddress__CountryCode__s,
					DeliveryAddress__GeocodeAccuracy__s,
					DeliveryAddress__Latitude__s,
					DeliveryAddress__Longitude__s,
					DeliveryAddress__PostalCode__s,
					DeliveryAddress__StateCode__s,
					DeliveryAddress__Street__s,
					CreatedDate,
					DueDate__c,
					DeliveryType__c,
					DeliveryLocationType__c,
					PickupLocationType__c,
					Order__c,
					DeliveryCenter__c,
					PickupCenter__c,
					(
						SELECT Name,
							Description__c,
							TrackingNumber__c
						FROM PackingSlips__r
						ORDER BY Name
					),
					(
						SELECT AvailableQuantity,
							BasePrice__c,
							DeliveryGroup__c,
							DeliveryType__c,
							Width__c,
							Height__c,
							Depth__c,
							Description,
							EndDate,
							ListPrice,
							Notes__c,
							OrderId,
							ParentOrderProduct__c,
							PricebookEntryId,
							Product2Id,
							Quantity,
							TotalPrice,
							UnitPrice,
							UnitType__c
						FROM OrderProducts__r
						ORDER BY CreatedDate
					),
					(
						SELECT BasePrice__c,
							DeliveryGroup__c,
							Width__c,
							Height__c,
							Depth__c,
							Description,
							ListPrice,
							Notes__c,
							OpportunityId,
							ParentOrderProduct__c,
							PricebookEntryId,
							Product2Id,
							Quantity,
							TotalPrice,
							UnitPrice,
							UnitType__c,
							DiscountType__c,
							DiscountAmount__c,
							WorkOrderStatus__c
						FROM OpportunityProducts__r
						ORDER BY CreatedDate
					)
				FROM DeliveryGroup__c
				WHERE Id = :deliveryGroupId
			];

			targetGroup = sourceGroup.clone(false, true, false, false);
			targetGroup.Name = newName;
			insert targetGroup;

			if (!sourceGroup.OrderProducts__r.isEmpty()) {
				newOrderProducts = new List<OrderItem>();

				for (OrderItem sourceOrderProduct : sourceGroup.OrderProducts__r) {
					targetOrderProduct =
						sourceOrderProduct.clone(false, true, false, false);
					targetOrderProduct.DeliveryGroup__c = targetGroup.Id;
					newOrderProducts.add(targetOrderProduct);
				}

				insert newOrderProducts;
			}

			if (!sourceGroup.OpportunityProducts__r.isEmpty()) {
				newOpportunityProducts = new List<OpportunityLineItem>();

				for (OpportunityLineItem sourceOpportunityProduct : sourceGroup.OpportunityProducts__r) {
					targetOpportunityProduct =
						sourceOpportunityProduct.clone(false, true, false, false);
					targetOpportunityProduct.DeliveryGroup__c = targetGroup.Id;
					newOpportunityProducts.add(targetOpportunityProduct);
				}

				insert newOpportunityProducts;
			}

			return targetGroup.Id;
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}
}