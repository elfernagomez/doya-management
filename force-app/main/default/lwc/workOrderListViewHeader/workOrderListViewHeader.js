import WorkOrderListViewEventBus from "c/workOrderListViewEventBus";
import { api, wire } from 'lwc';
import { getObjectInfo } from "lightning/uiObjectInfoApi";

import WORK_ORDER_OBJECT from '@salesforce/schema/WorkOrder';

export default class WorkOrderListViewHeader extends WorkOrderListViewEventBus {
	data = [];
	lastUpdated = new Date();
	timeAgo = "?";

	iconName = "standard:work_order";
	title = "Work Orders";
	listViews = [];
	columns = [];
	rowNumberColumnStyle = "width:3.5rem;";
	isFilterListOpen = false;

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
	
	@wire(getObjectInfo, {
		objectApiName: WORK_ORDER_OBJECT
	})
	wiredObjectInfo({ error, data }) {
		if (data) {
			
		}
	}

	connectedCallback() {
		this.subscribeToEvents();
	}

	disconnectedCallback() {
		this.unsubscribeFromEvents();
	}

	handleOnTimeAgoUpdate(event) {
		console.log(`time difference :: ${event.detail.timeAgo}`);
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
			default:
				break;
		}
	}
}