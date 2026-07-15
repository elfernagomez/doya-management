trigger OpportunityLineItemTrigger on OpportunityLineItem (
	before insert,
	before update,
	after insert,
	after update
) {
	new TriggerDispatcher(
		new OpportunityLineItemTriggerHandler(),
		new TriggerValidationManager('OpportunityLineItemTriggerHandler')
	).run();
}
