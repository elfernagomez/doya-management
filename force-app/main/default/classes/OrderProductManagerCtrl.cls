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
					OrderId,
					PricebookEntryId,
					Product2Id,
					Product2.Name,
					Product2.ProductCode,
					Product2.RecordTypeId,
					Product2.RecordType.DeveloperName
				FROM OrderItem
				WHERE OrderId = :orderId
				AND Product2.RecordType.DeveloperName = :productTypeName
				ORDER BY CreatedDate
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
			List<Id> itemsToDelete) {
		Map<Id, Id> pbeIds;
		List<Id> productIds;
		List<OrderItem> newItems;

		try {
			newItems = new List<OrderItem>();
			productIds = new List<Id>();

			// next block only if there are items to upsert
			if (!itemsToUpsert.isEmpty()) {
				for (OrderItem oi : itemsToUpsert)
					if (String.isBlank(oi.Id)) {
						newItems.add(oi);
						productIds.add(oi.Product2Id);
					}

				if (!newItems.isEmpty()) {
					pbeIds = getStandardPricebookEntryIds(productIds);
					// we have to go back and set it
					for (OrderItem oi : newItems)
						oi.PriceBookEntryId = pbeIds.get(oi.Product2Id);
				}

				upsert itemsToUpsert;
			}

			// next block only if there items to delete
			if (!itemsToDelete.isEmpty())
				delete [SELECT Id FROM OrderItem WHERE Id IN :itemsToDelete];

			return [
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
					OrderId,
					PricebookEntryId,
					Product2Id,
					Product2.Name,
					Product2.ProductCode,
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
	private static Map<Id, Id> getStandardPricebookEntryIds(List<Id> productIds) {
		Map<Id, Id> result = new Map<Id, Id>();
		for (PriceBookEntry pbe : [
				SELECT Id, Product2Id
				FROM PriceBookEntry
				WHERE Product2Id IN :productIds
				AND PriceBook2.IsStandard = true
				AND PriceBook2.IsActive = true
			])
			result.put(pbe.Product2Id, pbe.Id);

		return result;
	}
}