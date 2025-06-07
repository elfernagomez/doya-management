import WorkOrderListViewEventBus from "c/workOrderListViewEventBus";
import { track } from 'lwc';

import WORK_ORDER_OBJECT from '@salesforce/schema/WorkOrder';

export default class WorkOrderListViewHeader extends WorkOrderListViewEventBus {
	data = [];
	lastUpdated = new Date();
	timeAgo = "?";

	iconName = "standard:work_order";
	title = "Work Orders";
	listViews = [];
	columns = [];
	isFilterListOpen = false;

	@track
	filtersList;

	selectedListView = {
		title: "All Work Orders",
		label: "All Work Orders"
	};

	actions = [{
		label: "New",
		name: "new"
	}];

	get subtitle() {
		return `${this.data.length} items • Updated ${this.timeAgo}`;
	}
	
	get objectApiName() {
		return WORK_ORDER_OBJECT.objectApiName;
	}

	connectedCallback() {
		this.subscribeToEvents();
	}

	disconnectedCallback() {
		this.unsubscribeFromEvents();
	}

	handleOnTimeAgoUpdate(event) {
		this.timeAgo = event.detail.timeAgo;
	}

	handleOnActionSelect(event) {
		this.publishEvent(
			"headerActionSelected",
			{ ...event.detail });
	}

	handleOnLisViewButtonClick(event) {
		this.publishEvent(
			"listViewButtonClicked",
			event.detail);
	}

	handleOnSearchTextChange(event) {
		this.publishEvent(
			"searchTextChange",
			event.detail);
	}

	handleOnSelectAllChange(event) {
		this.publishEvent(
			"searchAllChange",
			event.detail);
	}
	

	handleOnFilterRemoved(event) {
		const index = event.currentTarget.dataset.index;
		this.publishEvent(
			"filterFieldRemovedRequested",
			this.filtersList[index]);
	}

	handleFilterFieldChanged(newFiltersList) {
		this.filtersList = newFiltersList;
	}

	handleWorkOrderListViewEventMessage(message) {
		console.log(`WorkOrderListViewHeader :: event received: ${message.eventId}`);
		switch (message.eventId) {
			case "columnsUpdated":
				this.columns = [...message.payload];
				break;
			case "workOrderPageFetched":
				this.data = [...message.payload];
				this.lastUpdated = new Date();
				break;
			case "filterListVisibilityUpdated":
				this.isFilterListOpen = message.payload == true;
				break;
			case "filterFieldChanged":
				this.handleFilterFieldChanged([...message.payload]);
				break;
			default:
				break;
		}
	}
}