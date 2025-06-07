import WorkOrderListViewEventBus from "c/workOrderListViewEventBus";
import { track, wire } from 'lwc';

import getFieldDetailsFromFieldSet
	from "@salesforce/apex/FieldSetManager.getFieldDetailsFromFieldSet";

import WORK_ORDER_OBJECT from '@salesforce/schema/WorkOrder';

export default class WorkOrderListViewFilters extends WorkOrderListViewEventBus {
	show = false;
	showForm = true;
	wiredFieldDetailsResult;

	@track
	fields = [];

	@track
	newFilters = {};

	@track
	filtersList = [];

	get objectApiName() {
		return WORK_ORDER_OBJECT.objectApiName;
	}

	get isApplyButtonDisabled() {
		return Object.keys(this.newFilters).length === 0;
	}

	@wire(getFieldDetailsFromFieldSet, {
		objectName: WORK_ORDER_OBJECT.objectApiName,
		fieldSetName: "WorkOrderListViewFilterFields"
	})
	wireGetFieldDetailsFromFieldSet(result) {
		const { error, data } = result;
		this.wiredFieldDetailsResult = result;
		if (data) {
			this.fields = data;
		} else if (error) {
			this.isLoading = false;
			this.addError("Error retrieving Work Order", error);
		}
	}

	connectedCallback() {
		this.subscribeToEvents();
	}

	disconnectedCallback() {
		this.unsubscribeFromEvents();
	}
	
	handleWorkOrderListViewEventMessage(message) {
		console.log(`WorkOrderListViewFilters :: event received: ${message.eventId}`);
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
			case "filterFieldRemovedRequested":
				this.handleOnFilterFieldRemovedRequested(message.payload);
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
		this.publishEvent("filterListVisibilityUpdated", this.show);
	}

	handleOnApplyFiltersClick(event) {
		const closeAfterApply = event.target.name == "applyAndClose";
		this.applyFilters(closeAfterApply);
	}

	handleOnFilterFieldChange(event) {
		const apiName = event.currentTarget.dataset.fieldName;
		// const field = this.fields.find(f => f.apiName == apiName);
		const value = event.target.value;

		if (value) {
			this.newFilters[apiName] = value;
		} else {
			delete this.newFilters[apiName];
		}

		this.newFilters = {...this.newFilters};
	}

	handleOnFilterFieldRemovedRequested(filterField) {
		this.filtersList = this.filtersList.filter(f => f.key != filterField.key);
		this.publishEvent("filterFieldChanged", this.filtersList);
	}

	handleOnFilterRemoved(event) {
		const index = event.currentTarget.dataset.index;
		const filterField = this.filtersList[index];
		this.filtersList = this.filtersList.filter(f => f.key != filterField.key);
		this.publishEvent("filterFieldChanged", this.filtersList);
	}

	applyFilters(closeAfterApply) {
		const newFiltersList = [];
		const keys = new Set(this.filtersList.map(f => f.key));
		Object.keys(this.newFilters).forEach(f => {
			const r = {
				key: `${f}:${this.newFilters[f]}`,
				value: this.newFilters[f],
				label: this.fields.find(of => of.apiName == f)?.label,
				fieldApiName: f
			};

			// a key match will prevent use from adding
			// he same field/value combination twice
			if (!keys.has(r.key)) {
				newFiltersList.push(r);
			}
		});

		this.filtersList = [
			...this.filtersList,
			...newFiltersList
		];

		this.newFilters = {};
		this.publishEvent("filterFieldChanged", this.filtersList);

		if (closeAfterApply) {
			this.handleOnClosePanelClick();
		} else {
			this.refreshForm();
		}
	}

	refreshForm() {
		this.showForm = false;
		// eslint-disable-next-line @lwc/lwc/no-async-operation
		setTimeout(() => {
			this.showForm = true;
		}, 100);
	}
}