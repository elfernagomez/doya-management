/**
 * Shared totals calculator for OrderItem and OpportunityLineItem.
 */
public without sharing class LineItemTotalsCalculator {
	private static final String PRODUCT_RT = 'Product';
	private static final String DISCOUNT_RT = 'Discount';
	private static final String PERCENTAGE_DISCOUNT = 'Percentage';

	public static void calculateOrderItemProductTotals(List<OrderItem> newItems) {
		calculateProductTotals(toSObjectList(newItems));
	}

	public static void calculateOpportunityLineItemProductTotals(List<OpportunityLineItem> newItems) {
		calculateProductTotals(toSObjectList(newItems));
	}

	public static void calculateOrderItemDiscountTotals(Map<Id, OrderItem> newMap) {
		calculateDiscountTotals(
			collectParentIds(toSObjectList(newMap == null ? null : newMap.values()), 'OrderId'),
			'OrderItem',
			'OrderId',
			'OrderItemTriggerHandler'
		);
	}

	public static void calculateOpportunityLineItemDiscountTotals(Map<Id, OpportunityLineItem> newMap) {
		calculateDiscountTotals(
			collectParentIds(toSObjectList(newMap == null ? null : newMap.values()), 'OpportunityId'),
			'OpportunityLineItem',
			'OpportunityId',
			'OpportunityLineItemTriggerHandler'
		);
	}

	private static void calculateProductTotals(List<SObject> newItems) {
		if (newItems == null || newItems.isEmpty()) {
			return;
		}

		Set<Id> productIds = new Set<Id>();
		for (SObject item : newItems) {
			Id productId = (Id)item.get('Product2Id');
			if (productId != null) {
				productIds.add(productId);
			}
		}

		if (productIds.isEmpty()) {
			return;
		}

		Map<Id, String> rtByProductId = new Map<Id, String>();
		for (Product2 product : [
			SELECT Id, RecordType.DeveloperName
			FROM Product2
			WHERE Id IN :productIds
		]) {
			rtByProductId.put(product.Id, product.RecordType.DeveloperName);
		}

		for (SObject item : newItems) {
			Id productId = (Id)item.get('Product2Id');
			if (productId == null || rtByProductId.get(productId) != PRODUCT_RT) {
				continue;
			}

			Decimal unitPrice = getDecimalValue(item.get('BasePrice__c'));
			String unitType = (String)item.get('UnitType__c');
			Decimal width = getDecimalValue(item.get('Width__c'));
			Decimal height = getDecimalValue(item.get('Height__c'));
			Decimal calculatedUnitPrice = calculateUnitPrice(unitPrice, unitType, width, height);
			if (calculatedUnitPrice != null) {
				item.put('UnitPrice', calculatedUnitPrice);
			}
		}
	}

	private static void calculateDiscountTotals(
		Set<Id> parentIds,
		String objectApiName,
		String parentFieldApi,
		String bypassHandlerName
	) {
		if (parentIds.isEmpty()) {
			return;
		}

		String discountQuery =
			'SELECT Id, ' + parentFieldApi + ', DiscountAmount__c ' +
			'FROM ' + objectApiName + ' ' +
			'WHERE ' + parentFieldApi + ' IN :parentIds ' +
			'AND Product2.RecordType.DeveloperName = :DISCOUNT_RT ' +
			'AND DiscountType__c = :PERCENTAGE_DISCOUNT';

		List<SObject> percentDiscountItems = Database.query(discountQuery);
		if (percentDiscountItems.isEmpty()) {
			return;
		}

		Set<Id> parentIdsForTotals = collectParentIds(percentDiscountItems, parentFieldApi);
		Map<Id, Decimal> productTotals = new Map<Id, Decimal>();

		String totalsQuery =
			'SELECT ' + parentFieldApi + ' parentId, SUM(TotalPrice) totalPrice ' +
			'FROM ' + objectApiName + ' ' +
			'WHERE ' + parentFieldApi + ' IN :parentIdsForTotals ' +
			'AND Product2.RecordType.DeveloperName = :PRODUCT_RT ' +
			'GROUP BY ' + parentFieldApi;

		for (AggregateResult ar : Database.query(totalsQuery)) {
			productTotals.put((Id)ar.get('parentId'), (Decimal)ar.get('totalPrice'));
		}

		for (SObject item : percentDiscountItems) {
			Id parentId = (Id)item.get(parentFieldApi);
			Decimal currentTotal = productTotals.get(parentId) ?? 0;
			Decimal currentPercentage = getDecimalValue(item.get('DiscountAmount__c')) / 100;
			Decimal amount = (currentTotal * currentPercentage) * -1;

			item.put('Quantity', 1);
			item.put('BasePrice__c', amount);
			item.put('UnitPrice', amount);
		}

		BaseTriggerValidationManager.bypass(bypassHandlerName);
		update percentDiscountItems;
		BaseTriggerValidationManager.clearBypass(bypassHandlerName);
	}

	private static Decimal calculateUnitPrice(
		Decimal basePrice,
		String unitType,
		Decimal width,
		Decimal height
	) {
		switch on unitType {
			when 'SqFt' {
				Decimal area = (width / 12) * (height / 12);
				return basePrice * area;
			}
			when 'Each' {
				return basePrice;
			}
			when 'Hour' {
				return basePrice;
			}
			when else {
				return null;
			}
		}
	}

	private static Set<Id> collectParentIds(List<SObject> items, String parentFieldApi) {
		Set<Id> parentIds = new Set<Id>();
		if (items == null || items.isEmpty()) {
			return parentIds;
		}

		for (SObject item : items) {
			Id parentId = (Id)item.get(parentFieldApi);
			if (parentId != null) {
				parentIds.add(parentId);
			}
		}

		return parentIds;
	}

	private static Decimal getDecimalValue(Object value) {
		return value == null ? 0 : (Decimal)value;
	}

	private static List<SObject> toSObjectList(List<OrderItem> items) {
		List<SObject> output = new List<SObject>();
		if (items != null) {
			output.addAll(items);
		}
		return output;
	}

	private static List<SObject> toSObjectList(List<OpportunityLineItem> items) {
		List<SObject> output = new List<SObject>();
		if (items != null) {
			output.addAll(items);
		}
		return output;
	}
}
