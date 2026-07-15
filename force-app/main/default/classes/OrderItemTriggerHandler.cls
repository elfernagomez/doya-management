/**
 * OrderItemTrigger.trigger handler.
 * @author Fernando Gomez
 * @version 1.0 3/13/2025
*/
public without sharing class OrderItemTriggerHandler extends TriggerHandler {
	private Map<Id, OrderItem> newOrderItemsMap;
	private List<OrderItem> newOrderItems;

	public OrderItemTriggerHandler() {
		super();
		newOrderItemsMap = getNewMap();
		newOrderItems = getNew();
	}

	public override void beforeInsert() {
		System.debug('OrderItemTriggerHandler : beforeInsert');
		LineItemTotalsCalculator.calculateOrderItemProductTotals(newOrderItems);
	}
	
	public override void beforeUpdate() {
		System.debug('OrderItemTriggerHandler : beforeUpdate');
		LineItemTotalsCalculator.calculateOrderItemProductTotals(newOrderItems);
	}
	
	public override void afterInsert() {
		System.debug('OrderItemTriggerHandler : afterInsert');
		LineItemTotalsCalculator.calculateOrderItemDiscountTotals(newOrderItemsMap);
	}
	
	public override void afterUpdate() {
		System.debug('OrderItemTriggerHandler : afterUpdate');
		LineItemTotalsCalculator.calculateOrderItemDiscountTotals(newOrderItemsMap);
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

}