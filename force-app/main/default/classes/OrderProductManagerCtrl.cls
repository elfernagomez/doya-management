/**
 * Controller for orderProductManager LWC
 * @author Fernando Gomez
 * @version 1.0 5/15/2023
 */
public with sharing class OrderProductManagerCtrl {

	/**
	 * @param orderId
	 * @return List<DeliveryGroup__c>
	 */
	@AuraEnabled(cacheable=false)
	public static List<DeliveryGroup__c> getDeliveryGroups(Id orderId) {
		try {
			return DeliveryGroupManager.getDeliveryGroups(
				new List<Id> { orderId }).get(orderId);
		} catch (Exception ex) {
			throw new AuraHandledException(ex.getMessage());
		}
	}

	/**
	 * @param orderProductId
	 * @return OrderItem
	 */
	@AuraEnabled
	public static OrderItem getSingleOrderProduct(Id orderProductId) {
		try {
			return [
				SELECT OrderItemNumber,
					AvailableQuantity,
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
					Order.DueDate__c,
					PricebookEntryId,
					ParentOrderProduct__c,
					ParentOrderProduct__r.Product2.Name,
					Product2Id,
					Product2.Name,
					Product2.ProductCode,
					Product2.Material__c,
					Product2.Material__r.Name,
					Product2.RecordTypeId,
					Product2.RecordType.DeveloperName
				FROM OrderItem
				WHERE Id = :orderProductId
			];
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}
	
	/**
	 * @param orderIds
	 * @return Map<Id, List<DeliveryGroup__c>>
	 */
	@AuraEnabled
	public static List<OrderItem> getOrderProductsByProductType(
		Id orderId,
		String productTypeName
	) {
		try {
			return [
				SELECT OrderItemNumber,
					AvailableQuantity,
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
					Order.DueDate__c,
					PricebookEntryId,
					ParentOrderProduct__c,
					ParentOrderProduct__r.Product2.Name,
					Product2Id,
					Product2.Name,
					Product2.ProductCode,
					Product2.Material__c,
					Product2.Material__r.Name,
					Product2.RecordTypeId,
					Product2.RecordType.DeveloperName
				FROM OrderItem
				WHERE OrderId = :orderId
				AND Product2.RecordType.DeveloperName = :productTypeName
				ORDER BY DeliveryGroup__r.DueDate__c NULLS LAST,
					DeliveryGroup__r.CreatedDate,
					CreatedDate
			];
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}
	
	/**
	 * @param itemsToUpsert
	 * @param itemsToDelete
	 */
	@AuraEnabled
	public static List<OrderItem> saveOrderProducts(
		List<OrderItem> itemsToUpsert,
		List<Id> itemsToDelete
	) {
		Map<Id, Id> pbeIds;
		List<Id> productIds;
		List<OrderItem> newItems;

		try {
			newItems = new List<OrderItem>();
			productIds = new List<Id>();

			// next block only if there are items to upsert
			if (!itemsToUpsert.isEmpty()) {
				for (OrderItem oi : itemsToUpsert) {
					if (String.isBlank(oi.Id)) {
						newItems.add(oi);
						productIds.add(oi.Product2Id);
					}
				}

				if (!newItems.isEmpty()) {
					pbeIds = getStandardPricebookEntryIds(productIds);
					// we have to go back and set it
					for (OrderItem oi : newItems) {
						oi.PriceBookEntryId = pbeIds.get(oi.Product2Id);
					}
				}

				upsert itemsToUpsert;
			}

			// next block only if there items to delete
			if (!itemsToDelete.isEmpty()) {
				delete [SELECT Id FROM OrderItem WHERE Id IN :itemsToDelete];
			}

			return [
				SELECT OrderItemNumber,
					AvailableQuantity,
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
					Order.DueDate__c,
					PricebookEntryId,
					ParentOrderProduct__c,
					ParentOrderProduct__r.Product2.Name,
					Product2Id,
					Product2.Name,
					Product2.ProductCode,
					Product2.Material__c,
					Product2.Material__r.Name,
					Product2.RecordTypeId,
					Product2.RecordType.DeveloperName
				FROM OrderItem
				WHERE Id IN :itemsToUpsert
				ORDER BY CreatedDate
			];
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

	/**
	 * @param productIds
	 * @return 
	 */
	@AuraEnabled(cacheable=false)
	public static List<DeliveryGroup__c> getOpportunityDeliveryGroups(Id opportunityId) {
		try {
			if (opportunityId == null)
				return new List<DeliveryGroup__c>();

			return [
				SELECT Id,
					Name,
					AddressLabel__c,
					DeliveryAddressHtml__c,
					PickupAddressHtml__c,
					CreatedDate,
					DueDate__c,
					DeliveryType__c,
					DeliveryLocationType__c,
					PickupLocationType__c,
					DeliveryCenter__c,
					DeliveryCenter__r.Name,
					PickupCenter__c,
					PickupCenter__r.Name,
					(
						SELECT Id,
							SortOrder,
							BasePrice__c,
							DeliveryType__c,
							CreatedDate,
							Width__c,
							Height__c,
							Depth__c,
							Description,
							DiscountType__c,
							DiscountAmount__c,
							Notes__c,
							Quantity,
							TotalPrice,
							UnitPrice,
							UnitType__c,
							WorkOrderStatus__c,
							DeliveryGroup__c,
							DeliveryGroup__r.Name,
							DeliveryGroup__r.DueDate__c,
							OpportunityId,
							PricebookEntryId,
							ParentOrderProduct__c,
							ParentOrderProduct__r.Product2.Name,
							Product2Id,
							Product2.Name,
							Product2.ProductCode,
							Product2.Material__c,
							Product2.Material__r.Name,
							Product2.RecordTypeId,
							Product2.RecordType.DeveloperName
						FROM OpportunityProducts__r
						ORDER BY CreatedDate ASC
					)
				FROM DeliveryGroup__c
				WHERE Opportunity__c = :opportunityId
				ORDER BY DueDate__c ASC NULLS LAST, CreatedDate ASC
			];
		} catch (Exception ex) {
			throw new AuraHandledException(ex.getMessage());
		}
	}

	@AuraEnabled
	public static List<OpportunityLineItem> getOpportunityProductsByProductType(
		Id opportunityId,
		String productTypeName
	) {
		try {
			if (opportunityId == null)
				return new List<OpportunityLineItem>();

			return [
				SELECT Id,
					SortOrder,
					BasePrice__c,
					DeliveryType__c,
					CreatedDate,
					Width__c,
					Height__c,
					Depth__c,
					Description,
					DiscountType__c,
					DiscountAmount__c,
					Notes__c,
					Quantity,
					TotalPrice,
					UnitPrice,
					UnitType__c,
					WorkOrderStatus__c,
					DeliveryGroup__c,
					DeliveryGroup__r.Name,
					DeliveryGroup__r.DueDate__c,
					OpportunityId,
					PricebookEntryId,
					ParentOrderProduct__c,
					ParentOrderProduct__r.Product2.Name,
					Product2Id,
					Product2.Name,
					Product2.ProductCode,
					Product2.Material__c,
					Product2.Material__r.Name,
					Product2.RecordTypeId,
					Product2.RecordType.DeveloperName
				FROM OpportunityLineItem
				WHERE OpportunityId = :opportunityId
				AND Product2.RecordType.DeveloperName = :productTypeName
				ORDER BY DeliveryGroup__r.DueDate__c NULLS LAST,
					DeliveryGroup__r.CreatedDate,
					CreatedDate
			];
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

	@AuraEnabled
	public static List<OpportunityLineItem> saveOpportunityProducts(
		List<OpportunityLineItem> itemsToUpsert,
		List<Id> itemsToDelete
	) {
		try {
			if (itemsToUpsert == null)
				itemsToUpsert = new List<OpportunityLineItem>();
			if (itemsToDelete == null)
				itemsToDelete = new List<Id>();

			if (!itemsToUpsert.isEmpty()) {
				List<OpportunityLineItem> newItems = new List<OpportunityLineItem>();
				Set<Id> productIds = new Set<Id>();
				Id opportunityId;

				for (OpportunityLineItem oli : itemsToUpsert) {
					if (String.isBlank(oli.Id)) {
						newItems.add(oli);
						if (oli.OpportunityId != null)
							opportunityId = oli.OpportunityId;
						if (oli.Product2Id != null)
							productIds.add(oli.Product2Id);
					}
				}

				if (!newItems.isEmpty()) {
					Map<Id, Id> pbeIds = getPricebookEntryIdsForOpportunity(
						new List<Id>(productIds),
						opportunityId
					);

					for (OpportunityLineItem oli : newItems) {
						if (oli.Product2Id != null)
							oli.PricebookEntryId = pbeIds.get(oli.Product2Id);
						if (oli.Quantity == null)
							oli.Quantity = 1;
						if (oli.UnitPrice == null)
							oli.UnitPrice = oli.BasePrice__c == null ? 0.01 : oli.BasePrice__c;
					}
				}

				upsert itemsToUpsert;
			}

			if (!itemsToDelete.isEmpty()) {
				delete [SELECT Id FROM OpportunityLineItem WHERE Id IN :itemsToDelete];
			}

			if (itemsToUpsert.isEmpty())
				return new List<OpportunityLineItem>();

			return [
				SELECT Id,
					SortOrder,
					BasePrice__c,
					DeliveryType__c,
					CreatedDate,
					Width__c,
					Height__c,
					Depth__c,
					Description,
					DiscountType__c,
					DiscountAmount__c,
					Notes__c,
					Quantity,
					TotalPrice,
					UnitPrice,
					UnitType__c,
					WorkOrderStatus__c,
					DeliveryGroup__c,
					DeliveryGroup__r.Name,
					DeliveryGroup__r.DueDate__c,
					OpportunityId,
					PricebookEntryId,
					ParentOrderProduct__c,
					ParentOrderProduct__r.Product2.Name,
					Product2Id,
					Product2.Name,
					Product2.ProductCode,
					Product2.Material__c,
					Product2.Material__r.Name,
					Product2.RecordTypeId,
					Product2.RecordType.DeveloperName
				FROM OpportunityLineItem
				WHERE Id IN :itemsToUpsert
				ORDER BY CreatedDate
			];
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}

	private static Map<Id, Id> getStandardPricebookEntryIds(List<Id> productIds) {
		Map<Id, Id> result = new Map<Id, Id>();
		for (PriceBookEntry pbe : [
			SELECT Id, Product2Id
			FROM PriceBookEntry
			WHERE Product2Id IN :productIds
			AND PriceBook2.IsStandard = true
			AND PriceBook2.IsActive = true
		]) {
			result.put(pbe.Product2Id, pbe.Id);
		}

		return result;
	}

	private static Map<Id, Id> getPricebookEntryIdsForOpportunity(List<Id> productIds, Id opportunityId) {
		Map<Id, Id> result = new Map<Id, Id>();
		if (productIds == null || productIds.isEmpty())
			return result;

		Id pricebookId;
		if (opportunityId != null) {
			Opportunity opportunityRecord = [
				SELECT Pricebook2Id
				FROM Opportunity
				WHERE Id = :opportunityId
				LIMIT 1
			];
			pricebookId = opportunityRecord.Pricebook2Id;
		}

		if (pricebookId != null) {
			for (PricebookEntry pbe : [
				SELECT Id, Product2Id
				FROM PricebookEntry
				WHERE Product2Id IN :productIds
				AND Pricebook2Id = :pricebookId
				AND IsActive = true
			]) {
				result.put(pbe.Product2Id, pbe.Id);
			}
		}

		Set<Id> missingProductIds = new Set<Id>(productIds);
		missingProductIds.removeAll(result.keySet());
		if (missingProductIds.isEmpty())
			return result;

		for (PricebookEntry pbe : [
			SELECT Id, Product2Id
			FROM PricebookEntry
			WHERE Product2Id IN :missingProductIds
			AND Pricebook2.IsStandard = true
			AND Pricebook2.IsActive = true
			AND IsActive = true
		]) {
			result.put(pbe.Product2Id, pbe.Id);
		}

		return result;
	}
}