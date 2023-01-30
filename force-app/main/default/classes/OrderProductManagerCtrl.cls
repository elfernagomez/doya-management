/**
 * @author Fernando Gomez
 */
public without sharing class OrderProductManagerCtrl {
	
	/**
	 * @param items
	 */
	@AuraEnabled
	public static void saveOrderProducts(List<OrderItem> items) {
		try {
			upsert items;
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}
}