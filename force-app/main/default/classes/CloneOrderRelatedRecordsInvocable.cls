/**
 * Order manager. Main functionality involving the Order object.
 * @author Fernando Gomez
 * @version 1.0 5/15/2023
 */
public with sharing class CloneOrderRelatedRecordsInvocable {

	/**
	 * @return the same list of ids for reference
	 * @param targetAndSourceWrapper
	 */
	@InvocableMethod(
		label='Clone Related Records'
		description='Clones related Delivery Groups and Order Products.'
		category='Order'
	)
	public static List<CloneOrderRelatedRecordsWrapper> cloneOrderRelatedRecords(
		List<CloneOrderRelatedRecordsWrapper> targetAndSourceWrapper
	) {
		List<Order> targetOrders = new List<Order>();
		List<Order> sourceOrders = new List<Order>();
		Map<Id, Order> targetOrdersMap;
		Map<Id, Order> sourceOrdersMap;
		List<String> sourceIds = new List<String>();

		for (CloneOrderRelatedRecordsWrapper w : targetAndSourceWrapper) {
			// we need to extract
			sourceIds.add(w.targetOrder.getCloneSourceId());
		}

		// we get the source orders
		// assuming getCloneSourceId will not return null,
		// otherwise this would, and should fail
		sourceOrdersMap = new Map<Id, Order>([
			SELECT Id
			FROM Order
			WHERE Id = :sourceIds
		]);

		for (CloneOrderRelatedRecordsWrapper w : targetAndSourceWrapper) {
			targetOrders.add(w.targetOrder);
			sourceOrders.add(sourceOrdersMap.get(w.targetOrder.getCloneSourceId()));
		}

		// now we have both lists with the same order,
		// we call the shared helper
		DeliveryGroupCloneService.cloneOrderDeliveryGroupsAndItems(targetOrders, sourceOrders);
		return targetAndSourceWrapper;
	}

	public class CloneOrderRelatedRecordsWrapper {
		@InvocableVariable(required=true)
		public Order targetOrder;
	}
}