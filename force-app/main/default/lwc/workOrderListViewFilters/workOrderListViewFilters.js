import WorkOrderListViewEventBus from "c/workOrderListViewEventBus";
import { api, wire } from 'lwc';

export default class WorkOrderListViewFilters extends WorkOrderListViewEventBus {
	show = false;

	connectedCallback() {
		this.subscribeToEvents();
	}

	disconnectedCallback() {
		this.unsubscribeFromEvents();
	}
	
	handleWorkOrderListViewEventMessage(message) {
		console.log(`WorkOrderListView :: event received: ${message.eventId}`);
		switch (message.eventId) {
			case "listViewButtonClicked":
				switch (message.payload.actionName) {
					case "filterList":
						this.handleFilterListAction();
						break;
					default:
						break;
				}
				break;
			default:
				break;
		}
	}

	handleFilterListAction() {
		this.show = !this.show;
		this.handleOnFilterListVisibilityUpdated();
	}

	handleOnClosePanelClick() {
		this.show = false;
		this.handleOnFilterListVisibilityUpdated();
	}

	handleOnFilterListVisibilityUpdated() {
		this.publishEvent(
			"filterListVisibilityUpdated",
			this.show);
	}
}