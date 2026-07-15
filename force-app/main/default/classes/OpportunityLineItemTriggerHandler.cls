/**
 * OpportunityLineItemTrigger.trigger handler.
 */
public without sharing class OpportunityLineItemTriggerHandler extends TriggerHandler {
	private Map<Id, OpportunityLineItem> newOpportunityLineItemsMap;
	private List<OpportunityLineItem> newOpportunityLineItems;

	public OpportunityLineItemTriggerHandler() {
		super();
		newOpportunityLineItemsMap = getNewMap();
		newOpportunityLineItems = getNew();
	}

	public override void beforeInsert() {
		System.debug('OpportunityLineItemTriggerHandler : beforeInsert');
		LineItemTotalsCalculator.calculateOpportunityLineItemProductTotals(newOpportunityLineItems);
	}

	public override void beforeUpdate() {
		System.debug('OpportunityLineItemTriggerHandler : beforeUpdate');
		LineItemTotalsCalculator.calculateOpportunityLineItemProductTotals(newOpportunityLineItems);
	}

	public override void afterInsert() {
		System.debug('OpportunityLineItemTriggerHandler : afterInsert');
		LineItemTotalsCalculator.calculateOpportunityLineItemDiscountTotals(newOpportunityLineItemsMap);
	}

	public override void afterUpdate() {
		System.debug('OpportunityLineItemTriggerHandler : afterUpdate');
		LineItemTotalsCalculator.calculateOpportunityLineItemDiscountTotals(newOpportunityLineItemsMap);
	}

	private List<OpportunityLineItem> getNew() {
		return triggerNew != null ? (List<OpportunityLineItem>)triggerNew : null;
	}

	private Map<Id, OpportunityLineItem> getNewMap() {
		return triggerMapNew != null ? (Map<Id, OpportunityLineItem>)triggerMapNew : null;
	}
}
