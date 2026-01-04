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
	 * Gets a page of Work Orders
	 * @param orderId
	 * @param searchText
	 * @param pageNumber
	 * @param pageSize
	 * @param sortBy
	 * @param isSortDesc
	 * @param filtersList
	 * @param selectedStatuses
	 * @return List<WorkOrder>
	 * @throws AuraHandledException
	 */
	@AuraEnabled(cacheable=true)
	public static List<WorkOrder> getWorkOrderPage(
		String orderId,
		String searchText,
		Integer pageNumber,
		Integer pageSize,
		String sortBy,
		Boolean isSortDesc,
		List<FilterWrapper> filtersList,
		List<String> selectedStatuses
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

			// we may or may not have an orderId filter
			if (String.isNotBlank(orderId)) {
				whereClause.add('Order__c = :orderId');
			}

			if (likeClause != null) {
				whereClause.add(
					'(WorkOrderNumber LIKE :likeClause ' +
					'OR Material__r.Name LIKE :likeClause ' + 
					'OR OrderProduct__r.Product2.Name LIKE :likeClause)');
			}

			// status filter
			if (selectedStatuses != null && !selectedStatuses.isEmpty()) {
				whereClause.add('Status IN :selectedStatuses');
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

	/**
	 * Gets OrderItem records related to WorkOrders through the junction object
	 * @param workOrderIds List of WorkOrder Ids
	 * @return Map<Id, List<OrderItem>> Map of WorkOrder Id to related OrderItems
	 * @throws AuraHandledException
	 */
	@AuraEnabled(cacheable=true)
	public static Map<Id, List<OrderItem>> getOrderItemsByWorkOrders(
		List<Id> workOrderIds
	) {
		Map<Id, List<OrderItem>> workOrderToOrderItems = new Map<Id, List<OrderItem>>();
		
		try {
			if (workOrderIds == null || workOrderIds.isEmpty()) {
				return workOrderToOrderItems;
			}

			// Query junction records to get OrderItems related to WorkOrders
			List<OrderItemWorkOrder__c> junctionRecords = [
				SELECT Id,
					WorkOrder__c,
					OrderItem__c,
					OrderItem__r.Id,
					OrderItem__r.OrderItemNumber,
					OrderItem__r.AvailableQuantity,
					OrderItem__r.BasePrice__c,
					OrderItem__r.CreatedDate,
					OrderItem__r.DeliveryType__c,
					OrderItem__r.Width__c,
					OrderItem__r.Height__c,
					OrderItem__r.Depth__c,
					OrderItem__r.Description,
					OrderItem__r.DiscountType__c,
					OrderItem__r.DiscountAmount__c,
					OrderItem__r.EndDate,
					OrderItem__r.ListPrice,
					OrderItem__r.Notes__c,
					OrderItem__r.Quantity,
					OrderItem__r.TotalPrice,
					OrderItem__r.UnitPrice,
					OrderItem__r.UnitType__c,
					OrderItem__r.WorkOrderStatus__c,
					OrderItem__r.DeliveryGroup__c,
					OrderItem__r.DeliveryGroup__r.Name,
					OrderItem__r.DeliveryGroup__r.DueDate__c,
					OrderItem__r.OrderId,
					OrderItem__r.Order.DueDate__c,
					OrderItem__r.PricebookEntryId,
					OrderItem__r.ParentOrderProduct__c,
					OrderItem__r.ParentOrderProduct__r.Product2.Name,
					OrderItem__r.Product2Id,
					OrderItem__r.Product2.Name,
					OrderItem__r.Product2.ProductCode,
					OrderItem__r.Product2.Material__c,
					OrderItem__r.Product2.Material__r.Name,
					OrderItem__r.Product2.RecordTypeId,
					OrderItem__r.Product2.RecordType.DeveloperName
				FROM OrderItemWorkOrder__c
				WHERE WorkOrder__c IN :workOrderIds
				ORDER BY OrderItem__r.DeliveryGroup__r.DueDate__c DESC,
					OrderItem__r.CreatedDate DESC
			];

			// Build the map
			for (OrderItemWorkOrder__c junction : junctionRecords) {
				if (!workOrderToOrderItems.containsKey(junction.WorkOrder__c)) {
					workOrderToOrderItems.put(
						junction.WorkOrder__c,
						new List<OrderItem>());
				}

				workOrderToOrderItems
					.get(junction.WorkOrder__c)
					.add(junction.OrderItem__r);
			}

			return workOrderToOrderItems;
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