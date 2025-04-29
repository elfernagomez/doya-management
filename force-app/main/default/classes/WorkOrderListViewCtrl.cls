/**
 * Controls: WorkOrderListView (LWC)
 * @author Fernando Gomez
 * @version 1.0
 * @since 4/9/2025
 */
public with sharing class WorkOrderListViewCtrl {
	
	/**
	 *
	 */
	public WorkOrderListViewCtrl() {

	}

	/**
	 * @param pageNumber
	 * @param pageSize
	 * @param filters
	 */
	@AuraEnabled(cacheable=true)
	public static List<WorkOrder> getWorkOrderPage(
		String searchText,
		Integer pageNumber,
		Integer pageSize,
		String sortBy,
		Boolean isSortDesc,
		Map<String, String> filters
	) {
		Integer offset;
		String likeClause = null;
		List<String> sortByFields;
		String ascDesc;

		try {
			offset = pageNumber * pageSize;

			if (String.isNotBlank(searchText)) {
				likeClause = ('%' + String.escapeSingleQuotes(searchText) + '%');
			}

			sortByFields = new List<String>();

			// if sort by is not already in the list
			if (String.isNotBlank(sortBy)) {
				sortByFields.add(
					String.escapeSingleQuotes(sortBy) +
					(isSortDesc ?
						String.escapeSingleQuotes(' DESC') :
						String.escapeSingleQuotes(' ASC')));
			} else {
				sortByFields.add(
					String.escapeSingleQuotes('CreatedDate DESC'));
			}

			return Database.query(
				'SELECT ' +
					'WorkOrderNumber, ' +
					'DueDate__c, ' +
					'Title__c, ' +
					'Width__c, ' +
					'Height__c, ' +
					'Depth__c, ' +
					'Quantity__c, ' +
					'Material__c, ' +
					'Material__r.Name, ' +
					'Order__c, ' +
					'Order__r.OrderNumber, ' +
					'OrderProduct__r.UnitType__c, ' +
					'OrderProduct__r.Product2Id, ' +
					'OrderProduct__r.Product2.Name, ' +
					'( ' +
						'SELECT Id, Status ' +
						'FROM WorkOrderLineItems ' +
						'ORDER BY Order__c ' +
					') ' +
				'FROM WorkOrder ' +
				(likeClause != null ?
					('WHERE WorkOrderNumber LIKE :likeClause ' +
					'OR Material__r.Name LIKE :likeClause ' +
					'OR Material__r.Name LIKE :likeClause ' + 
					'OR OrderProduct__r.Product2.Name LIKE :likeClause ') :
					'') +
				'ORDER BY ' + String.join(sortByFields, ', ') + ' ' +
				'LIMIT :pageSize ' +
				'OFFSET :offset '
			);
		} catch (Exception ex) {
			throw new AuraHandledException(ex.getMessage());
		}
	}

	/* private static List<WorkOrderWrapper> wrap(List<WorkOrder> workOrders) {
		List<WorkOrderWrapper> wrappers = new List<WorkOrderWrapper>();
		for (WorkOrder wo : workOrders)
			wrappers.add(new WorkOrderWrapper(wo));

		return wrappers;
	}

	public class WorkOrderWrapper {
		@AuraEnabled
		public String uniqueId;

		@AuraEnabled
		public String workOrderNumber;

		@AuraEnabled
		public String productId;

		@AuraEnabled
		public String productName;
		
		@AuraEnabled
		public String materialId;

		@AuraEnabled
		public String materialName;

		public WorkOrderWrapper(WorkOrder wo) {
			uniqueId = wo.Id;
			workOrderNumber = wo.WorkOrderNumber;
			productId = wo.OrderProduct__r.Product2Id;
			productName = wo.OrderProduct__r.Product2.Name;
			materialId = wo.Material__c;
			materialName = wo.Material__r.Name;

		}
	} */
}