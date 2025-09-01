import WorkOrderListViewEventBus from "c/workOrderListViewEventBus";
import { track } from 'lwc';

import largeView from './largeView.html';
import mediumView from './mediumView.html';

import WORK_ORDER_OBJECT from '@salesforce/schema/WorkOrder';

export default class WorkOrderListViewHeader extends WorkOrderListViewEventBus {
	data = [];
	lastUpdated = new Date();
	timeAgo = "?";

	title = "Work Orders";
	listViews = [];
	columns = [];
	selectedItems = [];
	isFilterListOpen = false;

	@track
	filtersList;

	@track
	statusOptions;

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

	get showSelectionActions() {
		return this.selectedItems.length > 0;
	}

	get showCompleteStepSelectionActions() {
		return this.selectedItems.find(item => item.isInProgress);
	}

	get showSetAsCurrentStepSelectionActions() {
		return this.selectedItems.find(item => !item.isInProgress);
	}

	get selectedStatuses() {
		return this.statusOptions?.filter(o => o.isSelected) || [];
	}

	connectedCallback() {
		this.subscribeToEvents();
	}

	disconnectedCallback() {
		this.unsubscribeFromEvents();
	}
	
	render() {
		return this.isSizeMedium ? mediumView : largeView;
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

	handleOnFilterFieldChanged(newFiltersList) {
		this.filtersList = newFiltersList;
	}

	handleStatusOptionsExternalChange(statusOptions) {
		this.statusOptions = statusOptions;
	}

	handleOnStatusRemoved(event) {
		const statusOptions = structuredClone(this.statusOptions);
		let option = statusOptions.find(o => o.key == event.target.dataset.key);
		option.isSelected = false;
		this.publishEvent("statusOptionsChanged", statusOptions);
	}

	handleOnColumnsUpdated(columns) {
		this.columns = columns;
	}

	handleOnWorkOrderPageFetched(data) {
		this.data = data;
		this.lastUpdated = new Date();
	}

	handleOnFilterListVisibilityUpdated(isFilterListOpen) {
		this.isFilterListOpen = isFilterListOpen;
	}

	handleOnItemSelectionChanged(selectedItems) {
		this.selectedItems = selectedItems;
	}

	handleOnSetAllAsCurrentStepClick() {
		this.publishEvent("setAllAsCurrentStepRequested");
	}

	handleOnCompleteAllStepsClick() {
		this.publishEvent("completeAllStepsRequested");
	}

	handleOnDeselectAllClick() {
		this.publishEvent("deselectAllItemsRequested");
	}

	handleWorkOrderListViewEventMessage(message) {
		console.log(`WorkOrderListViewHeader :: event received: ${message.eventId}`);
		switch (message.eventId) {
			case "columnsUpdated":
				this.handleOnColumnsUpdated([...message.payload]);
				break;
			case "workOrderPageFetched":
				this.handleOnWorkOrderPageFetched([...message.payload]);
				break;
			case "filterListVisibilityUpdated":
				this.handleOnFilterListVisibilityUpdated(message.payload == true);
				break;
			case "filterFieldChanged":
				this.handleOnFilterFieldChanged([...message.payload]);
				break;
			case "statusOptionsChanged":
				this.handleStatusOptionsExternalChange([...message.payload]);
				break;
			case "itemSelectionChanged":
				this.handleOnItemSelectionChanged([...message.payload]);
				break;
			default:
				break;
		}
	}
}