/**
 * Order manager. Main functionality involving the Order object.
 * @author Fernando Gomez
 * @version 1.0 5/15/2023
 */
public with sharing class OrderManager {
	private List<Id> orderIds;
	private List<Order> orders;

	public OrderManager(Id orderId) {
		this(new List<Id> { orderId });
	}

	public OrderManager(List<Id> orderIds) {
		this.orderIds = orderIds;
		this.orders = getOrdersByIds(orderIds);
	}

	/**
	 * Returns Orders with their related OrderItems
	 * @param workOrderId The Work Order Id to query OrderItems from
	 * @return List of Orders with related OrderItems
	 */
	@AuraEnabled(cacheable=true)
	public static List<Order> getOrderAndOrderItemsByWorkOrder(Id workOrderId) {
		Set<Id> orderIds = new Set<Id>();
		Set<Id> orderItemIds = new Set<Id>();
		
		for (OrderItemWorkOrder__c woi : [
			SELECT OrderItem__r.OrderId,
				OrderItem__c 
			FROM OrderItemWorkOrder__c 
			WHERE WorkOrder__c = :workOrderId
		]) {
			orderIds.add(woi.OrderItem__r.OrderId);
			orderItemIds.add(woi.OrderItem__c);
		}
		
		return [
			SELECT Name,
				DueDate__c,
				OrderNumber,
				Status,
				TotalAmount,
				AccountId,
				Account.Name,
				(
					SELECT OrderId,
						OrderItemNumber,
						AvailableQuantity,
						BasePrice__c,
						CreatedDate,
						DeliveryGroup__c,
						DeliveryType__c,
						Width__c,
						Height__c,
						Depth__c,
						Description,
						EndDate,
						ListPrice,
						Notes__c,
						PricebookEntryId,
						Product2Id,
						Product2.Name,
						Product2.ProductCode,
						Product2.Finish__c,
						Quantity,
						TotalPrice,
						UnitPrice,
						UnitType__c
					FROM OrderItems
					WHERE Id = :orderItemIds
				)
			FROM Order
			WHERE Id IN :orderIds
		];
	}

	/**
	 * Creates Work Orders based on the Order Products
	 * in the current Orders.
	 */
	public void createProductionOrders() {
		String uniqueKey;
		String uniqueKeyPattern = '{0}:{1}:{2}x{3}x{4}';
		Map<String, List<OrderItem>> itemsMappedByProduct;
		List<ProductionOrder__c> productionOrders = new List<ProductionOrder__c>();

		for (Order o : orders) {
			// all items of t he same product with the same width, height, and depth
			itemsMappedByProduct = new Map<String, List<OrderItem>>();

			// we group the items based on unique key...
			// same product + unit type + meassurements
			for (OrderItem oi : o.OrderItems) {
				uniqueKey = String.format(
					uniqueKeyPattern,
					new List<String> {
						oi.Product2Id,
						oi.UnitType__c,
						String.valueOf(oi.Width__c),
						String.valueOf(oi.Height__c),
						String.valueOf(oi.Depth__c)
					});

				if (itemsMappedByProduct.containsKey(uniqueKey))
					itemsMappedByProduct.get(uniqueKey).add(oi);
				else
					itemsMappedByProduct.put(
						uniqueKey,
						new List<OrderItem> { oi });
			}

			// now we have the group, we'll create
			// a work order per group
			/* for (String key : itemsMappedByProduct.keySet())
				productionOrders.add(new ProductionOrder__c(

				)); */
		}
	}

	/* public OrderManager(List<Order> orders) {
		this.orders = orders;
	} */

	private List<Order> getOrdersByIds(List<Id> orderIds) {
		return [
			SELECT Name,
				AccountId,
				(
					SELECT OrderItemNumber,
						AvailableQuantity,
						BasePrice__c,
						CreatedDate,
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
						PricebookEntryId,
						Product2Id,
						Product2.Name,
						Product2.ProductCode,
						Product2.Finish__c,
						Quantity,
						TotalPrice,
						UnitPrice,
						UnitType__c
					FROM OrderItems
				)
			FROM Order
			WHERE Id IN :orderIds
		];
	}
}