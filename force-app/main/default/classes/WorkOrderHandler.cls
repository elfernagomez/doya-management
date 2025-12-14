public without sharing class WorkOrderHandler {

	/**
	 * Wrapper class for Flow invocable action.
	 * Flow can pass a collection of records by Id using this structure.
	 */
	public class Request {
		@InvocableVariable(required=true)
		public Id WorkOrderId;
	}

	/**
	 * Invocable entry point for Flow.
	 * Accepts a list of Request (each containing a WorkOrder Id), queries the WorkOrder records,
	 * and delegates to the internal processor.
	 */
	@InvocableMethod(
		label='Create Work Order Line Items from SOP'
		description='Creates Work Order Line Items for provided WorkOrders based on their SOP__c.')
	public static void createWorkOrderLineItemsFromSop(List<Request> requests) {
		if (requests == null || requests.isEmpty()) return;

		Set<Id> woIds = new Set<Id>();
		for (Request r : requests) {
			if (r != null && r.WorkOrderId != null) woIds.add(r.WorkOrderId);
		}
		if (woIds.isEmpty()) return;

		List<WorkOrder> workOrders = [SELECT Id, SOP__c FROM WorkOrder WHERE Id IN :woIds];
		if (!workOrders.isEmpty()) {
			createWorkOrderLineItemsFromSopInternal(workOrders);
		}
	}

	/**
	 * Internal implementation (bulkified).
	 * Creates work order line items for the provided WorkOrders based on their SOP__c.
	 */
	private static void createWorkOrderLineItemsFromSopInternal(List<WorkOrder> workOrders) {
		if (workOrders == null || workOrders.isEmpty()) return;

		// collect SOP ids
		Set<Id> sopIds = new Set<Id>();
		for (WorkOrder wo : workOrders) {
			if (wo != null && wo.SOP__c != null) sopIds.add(wo.SOP__c);
		}
		if (sopIds.isEmpty()) return;

		// query SOP line items (select fields commonly needed on work order line items)
		List<SopLineItem__c> sopLines = [
			SELECT Id,
				Machine__c,
				Description__c,
				Finishing__c,
				Order__c,
				Procedure__c,
				ProductionNotes__c,
				SOP__c,
				Specifications__c,
				Specifics__c,
				Title__c,
				Type__c
			FROM SopLineItem__c
			WHERE SOP__c IN :sopIds
		];

		// map SOP -> lines
		Map<Id, List<SopLineItem__c>> sopMap = new Map<Id, List<SopLineItem__c>>();
		for (SopLineItem__c s : sopLines) {
			if (!sopMap.containsKey(s.SOP__c)) sopMap.put(s.SOP__c, new List<SopLineItem__c>());
			sopMap.get(s.SOP__c).add(s);
		}

		// build work order line items
		List<WorkOrderLineItem> toInsert = new List<WorkOrderLineItem>();
		for (WorkOrder wo : workOrders) {
			if (wo == null || wo.SOP__c == null) continue;
			List<SopLineItem__c> lines = sopMap.get(wo.SOP__c);
			if (lines == null || lines.isEmpty()) continue;

			for (SopLineItem__c s : lines) {
				WorkOrderLineItem li = new WorkOrderLineItem();
				li.WorkOrderId = wo.Id;
				li.Order__c = s.Order__c;
				li.Machine__c = s.Machine__c;
				li.Description = s.Description__c;
				li.Finishing__c = s.Finishing__c;
				li.Procedure__c = s.Procedure__c;
				li.ProductionNotes__c = s.ProductionNotes__c;
				li.Specifications__c = s.Specifications__c;
				li.Specifics__c = s.Specifics__c;
				li.Title__c = s.Title__c;
				li.Type__c = s.Type__c;
				toInsert.add(li);
			}
		}

		if (!toInsert.isEmpty()) {
			try {
				insert toInsert;
			} catch (DmlException ex) {
				// surface the error (caller/trigger/flow can handle or log)
				System.debug('WorkOrderHandler.createWorkOrderLineItemsFromSopInternal error: ' + ex.getMessage());
				throw ex;
			}
		}
	}
}