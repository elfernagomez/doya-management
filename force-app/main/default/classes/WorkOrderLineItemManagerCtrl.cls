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

	/**
	 * @param workOrderId
	 * @param fields list of field API names to query
	 * @return the list of line items for the given work order
	 */
	@AuraEnabled(cacheable=true)
	public static List<WorkOrderLineItem> getWorkOrderLineItems(
		Id workOrderId,
		List<String> fields
	) {
		try {
			if (!Schema.SObjectType.WorkOrderLineItem.isAccessible()) {
				throw new AuraHandledException(
					'Insufficient permissions to access Work Order Line Items');
			}

			if (fields != null && !fields.isEmpty()) {
				// Escape field names for managed package compatibility
				List<String> escapedFields = new List<String>();
				for (String field : fields) {
					escapedFields.add(String.escapeSingleQuotes(field));
				}

				String query =
					' SELECT ' + String.join(escapedFields, ', ') + 
					' FROM WorkOrderLineItem ' +
					' WHERE WorkOrderId = :workOrderId ' +
					' ORDER BY Order__c ASC NULLS LAST, CreatedDate ASC';
				
				System.debug('Query: ' + query);
				return Database.query(query);
			} else {
				return [
					SELECT WorkOrderId,
						Title__c,
						Order__c,
						Procedure__c,
						Machine__c
					FROM WorkOrderLineItem
					WHERE WorkOrderId = :workOrderId
					ORDER BY Order__c ASC
				];
			}
		} catch (Exception ex) {
			System.debug(ex.getMessage() + '\n' + ex.getStackTraceString());
			throw new AuraHandledException(ex.getMessage());
		}
	}
}