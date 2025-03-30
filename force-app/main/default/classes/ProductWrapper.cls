/**
 * Public wrapper to send calculated info to LWCs
 * @author Fernando Gomez
 * @version 1.0 3/6/2025
*/
public class ProductWrapper {
	public static final String PRODUCT_RT_NAME = 'Product';
	public static final String DISCOUNT_RT_NAME = 'Discount';

	@AuraEnabled
	public String productId { get; set; }
	
	@AuraEnabled
	public String productName { get; set; }
	
	@AuraEnabled
	public String productCode { get; set; }
	
	@AuraEnabled
	public Decimal depth { get; set; }
	
	@AuraEnabled
	public Decimal width { get; set; }
	
	@AuraEnabled
	public Decimal height { get; set; }
	
	@AuraEnabled
	public String finish { get; set; }
	
	@AuraEnabled
	public String unitType { get; set; }
	
	@AuraEnabled
	public Decimal unitPrice { get; set; }
	
	@AuraEnabled
	public String discountType { get; set; }
	
	@AuraEnabled
	public Decimal discountAmount { get; set; }
	
	@AuraEnabled
	public String productTypeId { get; set; }
	
	@AuraEnabled
	public String productTypeName { get; set; }

	@AuraEnabled
	public Boolean isProduct { get; set; }
	
	@AuraEnabled
	public Boolean isDiscount { get; set; }

	/**
	 * @param pbe
	 * @param product
	 */
	public ProductWrapper(PricebookEntry pbe, Product2 product) {
		productId = product.Id;
		productName = product.Name;
		productCode = product.ProductCode;
		depth = product.Depth__c;
		width = product.Width__c;
		height = product.Height__c;
		finish = product.Finish__c;
		unitType = product.QuantityUnitOfMeasure;
		unitPrice = pbe.UnitPrice;
		discountType = product.DiscountType__c;
		discountAmount = product.DiscountAmount__c;
		productTypeId = product.RecordTypeId;
		productTypeName = product.RecordType.DeveloperName;
		isProduct = product.RecordType.DeveloperName == PRODUCT_RT_NAME;
		isDiscount = product.RecordType.DeveloperName == DISCOUNT_RT_NAME;
	}

	/**
	 * @param pbe
	 * @param product
	 */
	/* public ProductWrapper(OrderItem orderProduct) {
		productId = orderProduct.Id;
		productName = product.Name;
		productCode = product.ProductCode;
		depth = product.Depth__c;
		width = product.Width__c;
		height = product.Height__c;
		finish = product.Finish__c;
		unitType = product.QuantityUnitOfMeasure;
		unitPrice = pbe.UnitPrice;
		productTypeId = orderProduct.Product2.RecordTypeId;
		productTypeName = orderProduct.Product2.RecordType.DeveloperName;
		isProduct = orderProduct.Product2.RecordTypeId == PRODUCT_RT_NAME;
		isDiscount = orderProduct.Product2.RecordType.DeveloperName == DISCOUNT_RT_NAME;
	} */
}