trigger OrderItemTrigger on OrderItem (
	before insert,
	before update,
	after insert,
	after update
) {
	new TriggerDispatcher(
		new OrderItemTriggerHandler(), 
		new TriggerValidationManager('OrderItemTriggerHandler')
	).run();
}