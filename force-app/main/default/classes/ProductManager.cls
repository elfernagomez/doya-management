/**
 * Common read/write method involving the Product2 object.
 * @author Fernando Gomez
 * @version 1.0 9/15/2024
 */
public with sharing class ProductManager {
	/**
	 * @param productId
	 * @param priceBookId
	 */
	@AuraEnabled
	public static ProductWrapper getProductWrapperById(Id productId, Id priceBookId) {
		Product2 product;
		List<PriceBookEntry> priceBookEntry;
		ProductWrapper result;
		try {
			product = [
				SELECT Name,
					ProductCode,
					Depth__c,
					DiscountType__c,
					DiscountAmount__c,
					Finish__c,
					Width__c,
					Height__c,
					QuantityUnitOfMeasure,
					RecordTypeId,
					RecordType.DeveloperName
				FROM Product2
				WHERE Id = :productId
			];

			if (String.isBlank(priceBookId))
				priceBookEntry = [
					SELECT UnitPrice
					FROM PriceBookEntry
					WHERE Product2Id = :productId
					AND PriceBook2.IsStandard = true
					AND PriceBook2.IsActive = true
				];
			else
				priceBookEntry = [
					SELECT UnitPrice
					FROM PriceBookEntry
					WHERE Product2Id = :productId
					AND PriceBook2Id = :priceBookId
				];
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}

		if (priceBookEntry.isEmpty())
			throw new AuraHandledException(Label.ProductManager_noPriceBookError);

		try {
			result = new ProductWrapper(priceBookEntry[0], product);
			return result;
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}
}