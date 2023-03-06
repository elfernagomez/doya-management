/**
 * @author Fernando Gomez
 */
public without sharing class OrderProductManagerCtrl {
	
	/**
	 * @param itemsToUpsert
	 * @param itemsToDelete
	 */
	@AuraEnabled
	public static void saveOrderProducts(
			List<OrderItem> itemsToUpsert,
			List<Id> itemsToDelete) {
		Map<Id, Id> pbeIds;
		List<Id> productIds;
		try {
			productIds = new List<Id>();
			for (OrderItem oi : itemsToUpsert)
				productIds.add(oi.Product2Id);

			pbeIds = getStandardPricebookEntryIds(productIds);
			// we have to go back and set it
			for (OrderItem oi : itemsToUpsert)
				// pricebook entry Id cannot be updated
				if (String.isBlank(oi.Id))
					oi.PriceBookEntryId = pbeIds.get(oi.Product2Id);

			upsert itemsToUpsert;

			// the we delete the ones requested for deletion
			if (!itemsToDelete.isEmpty())
				delete [SELECT Id FROM OrderItem WHERE Id IN :itemsToDelete];
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