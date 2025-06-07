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
		List<FilterWrapper> filtersList
	) {
		Integer offset;
		String likeClause = null;
		List<String> sortByFields;
		String ascDesc;
		List<FieldSetManager.FieldInfo> fields;
		Set<String> fieldApiNames;
		List<String> whereClause;
		String fieldName;
		String value;

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

			whereClause = new List<String>();

			if (likeClause != null) {
				whereClause.add(
					'(WorkOrderNumber LIKE :likeClause ' +
					'OR Material__r.Name LIKE :likeClause ' + 
					'OR OrderProduct__r.Product2.Name LIKE :likeClause)');
			}

			// custom filters
			if (filtersList != null && !filtersList.isEmpty()) {
				for (FilterWrapper filterWrapper : filtersList) {
					fieldName = String.escapeSingleQuotes(
						filterWrapper.fieldApiName);
					value = String.escapeSingleQuotes(
						String.valueOf(filterWrapper.value));

					if (filterWrapper.value instanceOf String) {
						value = '\'' + value + '\'';
					}

					whereClause.add(
						String.format(
							'({0} = {1})',
							new List<String> { fieldName, value }));
				}
			}

			String query =
				'SELECT Id ' +
				'FROM WorkOrder ' +
				(!whereClause.isEmpty() ?
					('WHERE ' + String.join(whereClause, ' AND ') + ' ') :
					'') +
				'ORDER BY ' + String.join(sortByFields, ', ') + ' ' +
				'LIMIT :pageSize ' +
				'OFFSET :offset ';
			System.debug(query);
			return Database.query(query);
		} catch (Exception ex) {
			System.debug(ex.getMessage() + '\n' + ex.getStackTraceString());
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

	public class FilterWrapper {
		@AuraEnabled
		public String fieldApiName { get; set; }

		@AuraEnabled
		public Object value { get; set; }
	}
}