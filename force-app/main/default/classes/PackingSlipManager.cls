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
	public static List<PackingSlip__c> getPackingSlipsForOrder(Id orderId) {
		try {
			return [
				SELECT Id, Name, Order__c, DeliveryGroup__c, DeliveryGroup__r.Name,
					Description__c, TrackingNumber__c,
					(SELECT Id, Name, Product__c, Quantity__c, OrderProduct__c
					FROM PackingSlipItems__r
					ORDER BY Name)
				FROM PackingSlip__c
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
				WHERE OrderId = :orderId
				ORDER BY OrderItemNumber
			];
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}
}
