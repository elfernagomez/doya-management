import LwcBase from 'c/lwcBase';
import { api, wire } from 'lwc';
import {
	publish,
	subscribe,
	unsubscribe,
	PAGE_SCOPE,
	MessageContext,
} from 'lightning/messageService';

import workOrderListViewEvent
	from '@salesforce/messageChannel/WorkOrderListViewEvent__c';

export default class WorkOrderListViewEventBus extends LwcBase {
	@wire(MessageContext)
	messageContext;

	@api
	size = "large";

	iconName = "standard:work_order";
	subscription = null;

	get isSizeMedium() {
		return this.size == "medium";
	}

	get isSizeLarge() {
		return this.size == "large";
	}

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
						scope: PAGE_SCOPE
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