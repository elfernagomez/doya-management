/**
 * Flow invocable facade for creating Orders from Opportunities.
 */
public with sharing class CreateOrderFromOpportunityInvocable {

	public class Request {
		@InvocableVariable(required=true label='Opportunity Id')
		public Id opportunityId;
	}

	public class Response {
		@InvocableVariable
		public Id opportunityId;

		@InvocableVariable
		public Id orderId;

		@InvocableVariable
		public Boolean success;

		@InvocableVariable
		public String message;
	}

	@InvocableMethod(
		label='Create Orders From Opportunities'
		description='Creates Draft Orders for input Opportunities using a reusable bulkified service.'
		category='Order'
	)
	public static List<Response> createOrders(List<Request> requests) {
		Set<Id> opportunityIds = new Set<Id>();
		if (requests != null) {
			for (Request req : requests) {
				if (req != null && req.opportunityId != null) {
					opportunityIds.add(req.opportunityId);
				}
			}
		}

		List<OpportunityOrderService.Result> serviceResults =
			OpportunityOrderService.createOrdersFromOpportunities(opportunityIds);

		List<Response> output = new List<Response>();
		for (OpportunityOrderService.Result serviceResult : serviceResults) {
			Response response = new Response();
			response.opportunityId = serviceResult.opportunityId;
			response.orderId = serviceResult.orderId;
			response.success = serviceResult.success;
			response.message = serviceResult.message;
			output.add(response);
		}

		return output;
	}
}
