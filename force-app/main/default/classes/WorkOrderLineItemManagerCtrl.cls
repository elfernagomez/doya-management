/**
 * Controls: WorkOrderLineItemManager (LWC)
 * @author Fernando Gomez
 * @version 1.0
 * @since 4/9/2025
 */
public with sharing class WorkOrderLineItemManagerCtrl {

	/**
	 * @param workOrderLineItems
	 * @return the same list, updated
	 */
	@AuraEnabled(cacheable=false)
	public static List<WorkOrderLineItem> updateWorkOrderLineItems(
		List<WorkOrderLineItem> workOrderLineItems
	) {
		try {
			update workOrderLineItems;
			return workOrderLineItems;
		} catch (Exception ex) {
			System.debug(ex.getMessage() + '\n' + ex.getStackTraceString());
			throw new AuraHandledException(ex.getMessage());
		}
	}
}