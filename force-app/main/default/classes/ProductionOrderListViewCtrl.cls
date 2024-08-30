/**
 * @author Fernando Gomez
 */
public without sharing  class ProductionOrderListViewCtrl {

	/**
	 * @param pageNumber
	 * @param pageSize
	 * @param filters
	 */
	@AuraEnabled
	public static List<ProductionOrderWrapper> getProductionOrders(
		Integer pageNumber,
		Integer pageSize,
		Map<String, String> filters
	) {
		Integer offset = pageNumber * pageSize;

		return wrap([
			SELECT Title__c
			FROM ProductionOrder__c
			ORDER BY DueDate__c, CreatedDate
			LIMIT :pageSize
			OFFSET :offset
		]);
	}

	private static List<ProductionOrderWrapper> wrap(
		List<ProductionOrder__c> productionOrders
	) {
		List<ProductionOrderWrapper> wrappers =
			new List<ProductionOrderWrapper>();

		for (ProductionOrder__c po : productionOrders)
			wrappers.add(new ProductionOrderWrapper(po));

		return wrappers;
	}

	public class ProductionOrderWrapper {
		@AuraEnabled
		public String recordId;

		@AuraEnabled
		public String title;

		public ProductionOrderWrapper(ProductionOrder__c po) {
			recordId = po.Id;
			title = po.Title__c;
		}
	}
}