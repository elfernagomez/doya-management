/**
 * OrderItemTrigger.trigger handler.
 * @author Fernando Gomez
 * @version 1.0 3/13/2025
*/
public without sharing class OrderItemTriggerHandler extends TriggerHandler {
	private Map<Id, OrderItem> newOrderItemsMap;

	public OrderItemTriggerHandler() {
		newOrderItemsMap = getNewMap();
	}

	public override void beforeInsert() {
		System.debug('OrderItemTriggerHandler : beforeInsert');
		calculateProductTotals();
	}
	
	public override void beforeUpdate() {
		System.debug('OrderItemTriggerHandler : beforeUpdate');
		calculateProductTotals();
	}
	
	public override void afterInsert() {
		System.debug('OrderItemTriggerHandler : afterInsert');
		calculateDisocuntTotals();
	}
	
	public override void afterUpdate() {
		System.debug('OrderItemTriggerHandler : afterUpdate');
		calculateDisocuntTotals();
	}
  
	/**
	 * @return the old list, already caster
	 */
	private List<OrderItem> getNew() {
		return triggerNew != null ? (List<OrderItem>)triggerNew : null;
	}
  
	/**
	 * @return the old list, already caster
	 */
	private Map<Id, OrderItem> getNewMap() {
		return triggerMapNew != null ? (Map<Id, OrderItem>)triggerMapNew : null;
	}

	/**
	 * @return the old list, already caster
	 */
	private List<OrderItem> getOld() {
		return triggerOld != null ? (List<OrderItem>)triggerOld : null;
	}

	/**
	 * @return the old list, already caster
	 */
	private Map<Id, OrderItem> getOldMap() {
		return triggerMapOld != null ? (Map<Id, OrderItem>)triggerMapOld : null;
	}

	/**
	 * Calculates the totals of the Product items.
	 */
	private void calculateProductTotals() {
		Set<Id> orderIds = new Set<Id>();
		Set<Id> productIds = new Set<Id>();
		Map<Id, String> rtMap = new Map<Id, String>();
		List<OrderItem> productItems = new List<OrderItem>();
		Decimal area;
		Decimal width;
		Decimal height;
		Decimal unitPrice;

		// we just need to grab the order ids
		for (OrderItem oi : newOrderItemsMap.values()) {
			orderIds.add(oi.OrderId);
			productIds.add(oi.Product2Id);
		}

		for (Product2 product : [
			SELECT RecordType.DeveloperName
			FROM Product2
			WHERE Id IN :productIds
		]) {
			rtMap.put(product.Id, product.RecordType.DeveloperName);
		}

		productItems = new List<OrderItem>();
		for (OrderItem oi : newOrderItemsMap.values()) {
			if (rtMap.get(oi.Product2Id) == 'Product') {
				productItems.add(oi);
			}
		}

		if (!productItems.isEmpty()) {
			orderIds.clear();

			for (OrderItem oi : productItems) {
				unitPrice = oi.BasePrice__c ?? 0;
				switch on oi.UnitType__c {
					when 'SqFt' {
						width = oi.Width__c ?? 0;
						height = oi.Height__c ?? 0;
						area = (width / 12) * (height / 12);
						oi.UnitPrice = unitPrice * area;
					}
					when 'Each' {
						oi.UnitPrice = unitPrice;
					}
					when 'Hour' {
						oi.UnitPrice = unitPrice;
					}
					when else {
						
					}
				}
			}
			
			/*
			BaseTriggerValidationManager.bypass('OrderItemTriggerHandler');
			update productItems;
			BaseTriggerValidationManager.clearBypass('OrderItemTriggerHandler');
			*/
		}
	}

	/**
	 * Calculates the totals of the Discount items.
	 */
	private void calculateDisocuntTotals() {
		Set<Id> orderIds = new Set<Id>();
		List<OrderItem> precentDiscountItems;
		Map<Id, Decimal> productTotals;
		Decimal currentTotal;
		Decimal currentPercentage;

		// we just need to grab the order ids
		for (OrderItem oi : newOrderItemsMap.values()) {
			orderIds.add(oi.OrderId);
		}

		// we need to recalulate Discount order items
		// that are percentage based
		precentDiscountItems = [
			SELECT Id,
				OrderId,
				DiscountAmount__c
			FROM OrderItem
			WHERE OrderId = :orderIds
			AND Product2.RecordType.DeveloperName = 'Discount'
			AND DiscountType__c = 'Percentage'
		];

		if (!precentDiscountItems.isEmpty()) {
			productTotals = new Map<Id, Decimal>();
			orderIds.clear();

			// we then need the Product's totals
			// to be able to calculate the discount amounts
			for (OrderItem oi : precentDiscountItems) {
				orderIds.add(oi.OrderId);
			}

			for (AggregateResult ar : [
				SELECT OrderId orderId, SUM(TotalPrice) totalPrice
				FROM OrderItem
				WHERE OrderId = :orderIds
				AND Product2.RecordType.DeveloperName = 'Product'
				GROUP BY OrderId
			]) {
				productTotals.put(
					(Id)ar.get('orderId'),
					(Decimal)ar.get('totalPrice'));
			}

			for (OrderItem oi : precentDiscountItems) {
				currentTotal = productTotals.get(oi.OrderId) ?? 0;
				currentPercentage = (oi.DiscountAmount__c ?? 0) / 100;
				oi.Quantity = 1;
				oi.BasePrice__c = (currentTotal * currentPercentage) * -1;
				oi.UnitPrice = (currentTotal * currentPercentage) * -1;
			}

			BaseTriggerValidationManager.bypass('OrderItemTriggerHandler');
			update precentDiscountItems;
			BaseTriggerValidationManager.clearBypass('OrderItemTriggerHandler');
		}
	}
}