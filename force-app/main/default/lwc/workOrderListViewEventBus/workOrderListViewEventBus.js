import LwcBase from 'c/lwcBase';
import { wire } from 'lwc';
import {
	publish,
	subscribe,
	unsubscribe,
	APPLICATION_SCOPE,
	MessageContext,
} from 'lightning/messageService';

import workOrderListViewEvent
	from '@salesforce/messageChannel/WorkOrderListViewEvent__c';

export default class WorkOrderListViewEventBus extends LwcBase {
	@wire(MessageContext)
	messageContext;

	subscription = null;

	publishEvent(eventId, payload) {
		publish(
			this.messageContext,
			workOrderListViewEvent,
			{
				eventId,
				payload
			});
	}

	subscribeToEvents() {
		if (!this.subscription) {
			this.subscription =
				subscribe(
					this.messageContext,
					workOrderListViewEvent,
					message => this.handleWorkOrderListViewEventMessage(message),
					{
						scope: APPLICATION_SCOPE
					});
		}
	}

	unsubscribeFromEvents() {
		unsubscribe(this.subscription);
		this.subscription = null;
	}

	handleWorkOrderListViewEventMessage(message) {
		// subclasses should override
	}
}