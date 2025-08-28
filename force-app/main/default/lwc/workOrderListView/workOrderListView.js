import WorkOrderListViewEventBus from "c/workOrderListViewEventBus";
import { NavigationMixin } from "lightning/navigation";
import LightningConfirm from 'lightning/confirm';
import styles from "./styles.css";
import { track, wire } from 'lwc';
import { getRecords } from 'lightning/uiRecordApi';
import { workOrderListViewLabels } from 'c/constants';

import getWorkOrderPage
	from "@salesforce/apex/WorkOrderListViewCtrl.getWorkOrderPage";
import getFieldDetailsFromFieldSet
	from "@salesforce/apex/FieldSetManager.getFieldDetailsFromFieldSet";

import WORK_ORDER_OBJECT from '@salesforce/schema/WorkOrder';

export default class WorkOrderListView
		extends NavigationMixin(WorkOrderListViewEventBus) {

	static stylesheets = [styles];

	@track
	columns = [];

	@track
	data = [];

	isLoading = false;
	isAllSelected = false;
	wiredWorkOrderPageResult;
	wiredFieldDetailsResult;
	getRecordsConfig;
	searchText;
	sortBy;
	isSortDesc;
	pageNumber;
	pageSize;
	filtersList;
	selectedStatuses;
	cacheBust;

	noColumnWidth = "3.5rem";
	checkboxColumnWidth = "32px";
	numericColumnWidth = "6rem";

	labels = {
		...workOrderListViewLabels
	};

	baseHeaderClasses = [
		"slds-is-resizable",
		"slds-is-sortable",
		"slds-cell_action-mode",
		"slds-border_left"
	];

	baseCellClasses = [
		"slds-cell_action-mode",
		"neutral-65"
	];

	baseHeaderClass = this.baseHeaderClasses.join(" ");
	baseCellClass = this.baseCellClasses.join(" ");

	get objectApiName() {
		return WORK_ORDER_OBJECT.objectApiName;
	}

	get rowNumberColumnStyle() {
		return `width:${this.noColumnWidth};`;
	}

	get rowCheckboxColumnStyle() {
		return `width:${this.checkboxColumnWidth};`;
	}

	get workOrderFields() {
		const result = [`${this.objectApiName}.Id`];
		this.columns.forEach(c => {
			result.push(`${this.objectApiName}.${c.fieldName}`);
			if (c.isLookup && c.relationshipName && c.relatedTo) {
				result.push([
					this.objectApiName,
					c.relationshipName,
					c.relatedTo.nameFieldApiName
				].join("."));
			}
		});
		return result;
	}

	@wire(getFieldDetailsFromFieldSet, {
		objectName: WORK_ORDER_OBJECT.objectApiName,
		fieldSetName: "WorkOrderListViewFields"
	})
	wireGetFieldDetailsFromFieldSet(result) {
		const { error, data } = result;
		this.wiredFieldDetailsResult = result;
		if (data) {
			this.columns = data.map(field => this.getField(field));
			this.updateColumnsRefence();
			this.reset();
		} else if (error) {
			this.isLoading = false;
			this.addError(
				["We encountered an issue while retrieving fielset information",
					...this.getDmlErrors(error)].join(". "),
				error);
		}
	}

	@wire(getWorkOrderPage, {
		searchText: "$searchText",
		pageNumber: "$pageNumber",
		pageSize: "$pageSize",
		sortBy: "$sortBy",
		isSortDesc: "$isSortDesc",
		filtersList: "$filtersList",
		selectedStatuses: "$selectedStatuses",
		cacheBust: "$cacheBust"
	})
	wiredWorkOrderPage(result) {
		const { error, data } = result;
		this.wiredWorkOrderPageResult = result;
		if (data) {
			const recordIds = data.map(r => r.Id);
			const fields = this.workOrderFields;
			this.removeError();

			if (recordIds.length) {
				this.getRecordsConfig = [{
					recordIds,
					fields
				}];
			} else {
				this.isLoading = false;
				this.data = [];
				this.publishEvent(
					"workOrderPageFetched",
					[]);
			}
		} else if (error) {
			this.isLoading = false;
			this.addError(
				["We encountered an issue while retrieving the work orders",
					...this.getDmlErrors(error)].join(". "),
				error);
		}
	}

	@wire(getRecords, {
		records: "$getRecordsConfig"
	})
	wiredRecords({ data, error }) {
		if (data) {
			if (this.pageNumber == 0)
				this.data = [];

			let order = this.data.length;
			this.data.push(...data.results.map(r => ({
				rowNumber: ++order,
				isSelected: false,
				isOpen: false,
				uniqueId: r.result.id,
				selectedItemId: null,
				data: r.result.fields,
				columns: this.columns.map(c => ({
					key: `${c.fieldName}_${r.result.id}`,
					column: c
				}))
			})));
			
			this.isLoading = false;
			this.publishEvent(
				"workOrderPageFetched",
				this.data.map(row => ({
					rowNumber: row.rowNumber,
					uniqueId: row.uniqueId
				})));
		} else if (error) {
			this.error = error;
			this.records = [];
		}
	}

	connectedCallback() {
		this.subscribeToEvents();
	}

	disconnectedCallback() {
		this.unsubscribeFromEvents();
	}

	handleOnSelectAllChange() {
		this.isAllSelected = !this.isAllSelected;
		this.data.forEach((row, index) =>
			this.editDataRow(
				index,
				{
					isSelected: this.isAllSelected
				}));
	}

	handleOnColmunClick(event) {
		event.preventDefault();
		const fieldName = event.currentTarget.dataset.fieldName;
		const column = this.columns.find(c => c.fieldName == fieldName);
		this.sortByColumn(column);
	}

	handleOnSelectRowChange(event) {
		const index = parseInt(event.currentTarget.dataset.index, 10);
		const isSelected = event.target.checked;
		this.editDataRow(
			index,
			{
				isSelected
			});
		this.calculateIsAllSelected();
	}

	handleOnOpenRowClick(event) {
		const index = parseInt(event.currentTarget.dataset.index, 10);
		const selectedItemId = this.autoSelect(index);
		this.editDataRow(
			index,
			{
				isOpen: true,
				selectedItemId
			});
	}

	handleOnCloseRowClick(event) {
		const index = parseInt(event.currentTarget.dataset.index, 10);
		this.editDataRow(
			index,
			{
				isOpen: false
			});
	}

	handleOnLineItemSelected() {
		const selectedItems = [];
		this.getAllComponents("c-work-order-line-item-manager")
			.forEach((c, i) => {
				const s = c.selectedItem;
				const row = this.data[i];
				if (s) {
					selectedItems.push(s);
					row.selectedItemId = s.uniqueId;
				} else {
					row.selectedItemId = null;
				}
			});
		this.publishEvent(
			"itemSelectionChanged",
			selectedItems);
	}

	handleOnDeselectAllItemsRequested() {
		this.getAllComponents("c-work-order-line-item-manager")
			.forEach(c => (c.selectedItemId = null));
		this.handleOnLineItemSelected();
	}

	handleOnSetAllAsCurrentStepRequested() {
		LightningConfirm.open({
			message: this.labels.setAllAsCurrentStepMessage,
			variant: "header",
			label: this.labels.setAllAsCurrentStepTitle,
			// setting theme would have no effect
		}).then(result => {
			if (result) {
				this.getAllComponents("c-work-order-line-item-manager")
					.forEach(c => {
						if (c.selectedItemId) {
							c.setAsCurrentStep(c.selectedItemId);
						}
					});
			}
		});
	}

	handleOnCompleteAllStepsRequested() {
		LightningConfirm.open({
			message: this.labels.completeAllStepsMessage,
			variant: "header",
			label: this.labels.completeAllStepsTitle,
			// setting theme would have no effect
		}).then(result => {
			if (result) {
				this.getAllComponents("c-work-order-line-item-manager")
					.forEach(c => {
						if (c.selectedItemId) {
							c.setAsCompletedStep(c.selectedItemId);
						}
					});
			}
		});
	}

	handleWorkOrderListViewEventMessage(message) {
		console.log(`WorkOrderListView :: event received: ${message.eventId}`);
		switch (message.eventId) {
			case "headerActionSelected":
				switch (message.payload.name) {
					case "new":
						this.handleNewWorkkOrderAction();
						break;
					default:
						break;
				}
				break;
			case "listViewButtonClicked":
				switch (message.payload.actionName) {
					case "refresh":
						this.handleRefreshAction();
						break;
					default:
						break;
				}
				break;
			case "searchTextChange":
				this.search(message.payload.value);
				break;
			case "searchAllChange":
				this.handleOnSelectAllChange();
				break;
			case "filterFieldChanged":
				this.handleFilterFieldChange([...message.payload]);
				break;
			case "statusOptionsChanged":
				this.handleStatusOptionsChange([...message.payload]);
				break;
			case "deselectAllItemsRequested":
				this.handleOnDeselectAllItemsRequested();
				break;
			case "setAllAsCurrentStepRequested":
				this.handleOnSetAllAsCurrentStepRequested();
				break;
			case "completeAllStepsRequested":
				this.handleOnCompleteAllStepsRequested();
				break;
			default:
				break;
		}
	}

	handleRefreshAction() {
		this.isLoading = true;
		this.firstPage();
	}

	handleNewWorkkOrderAction() {
		this[NavigationMixin.Navigate]({
			type: "standard__objectPage",
			attributes: {
				objectApiName: "WorkOrder",
				actionName: "new"
			}
		});
	}

	handleFilterFieldChange(filtersList) {
		this.filtersList = filtersList;
		this.handleRefreshAction();
	}

	handleStatusOptionsChange(selectedStatuses) {
		this.selectedStatuses =
			selectedStatuses
				.filter(o => o.isSelected)
				.map(o => o.value);
		this.handleRefreshAction();
	}

	editDataRow(index, changes, updateDataRefence = true) {
		const row = this.data[index];
		this.mergeObjects(row, changes);
		
		if (updateDataRefence)
			this.updateInnerRefence(index);
	}

	updateColumnsRefence() {
		this.columns.forEach(c => (c.styles = this.getColumnStyle(c)));
		this.columns = [...this.columns];
	}

	updateDataRefence() {
		this.data = [...this.data];
	}

	updateInnerRefence(index) {
		this.data[index] = {...this.data[index]};
	}

	sortByColumn(column) {
		// click has effect of sort if not sorting
		// or switch asc/desc if sorting
		if (column.isSorting) {
			this.isSortDesc = !this.isSortDesc;
		} else {
			this.sortBy = column.sortByFieldName;
			this.isSortDesc = false;
		}

		// remove sorting for the rest of the columsn
		this.columns
			.filter(c => c.fieldName != column.fieldName)
			.forEach(c => {
				c.isSorting = false;
				c.isSortDesc = false;
			});
		
		column.isSorting = true;
		column.isSortDesc = this.isSortDesc;
		this.updateColumnsRefence();
		
		this.isLoading = true;
		this.firstPage();
	}

	reset() {
		this.searchText = null;
		this.sortBy = "DueDate__c";
		this.isSortDesc = true;
		this.pageNumber = 0;
		this.pageSize = 100;
		this.filtersList = [];
		this.selectedStatuses = [];
		this.getPage();
	}

	firstPage() {
		this.pageNumber = 0;
		this.getPage();
	}

	getPage() {
		this.cacheBust = new Date().toISOString();
	}

	search(searchText) {
		this.searchText = searchText;
	}

	autoSelect(index) {
		const row = this.data[index];
		if (row.selectedItemId)
			return row.selectedItemId;
		/* 
		// TODO: Finish auto selection...
		// any In Progress step,
		// or the first Pending step,
		// or the last Completed step.
		const selectedItem =
			row.WorkOrderLineItems != null ?
				(row.WorkOrderLineItems.find(
					woli => woli.Status__c == "In Progress") ||
				row.WorkOrderLineItems.find(
					woli => woli.Status__c == "New") ||
				row.WorkOrderLineItems[0]) :
				null;
		return selectedItem?.Id;
		*/
		return null;
	}

	isItemSelected(index, selectedItemId) {
		const row = this.data[index];
		return row.selectedItemId == selectedItemId;
	}

	calculateIsAllSelected() {
		this.isAllSelected = this.data.every(row => row.isSelected);
	}

	getColumnStyle(column) {
		const numw = this.numericColumnWidth;
		const nonNumCount = this.columns.filter(c => !c.isNumeric).length;

		let added = [
			this.noColumnWidth,
			this.checkboxColumnWidth,
			...this.columns.filter(c => c.isNumeric).map(() => numw)
		];

		const baseStyles = 
			column.isNumeric ?
			[`width: ${numw}`] :
			[`width: calc((100% - (${added.join(" + ")})) / ${nonNumCount})`];

		// head
		const headerStyle = [...baseStyles];
		const headerClass = [...this.baseHeaderClasses];

		if (column.isSorting)
			headerClass.push("slds-is-sorted");

		if (column.isSortDesc)
			headerClass.push("slds-is-sorted_desc");

		const header = {
			style: headerStyle.join(";"),
			class: headerClass.join(" ")
		};

		// cell
		const cellStyle = [...baseStyles];
		const cellClass = [];

		if (column.isNumeric) {
			cellStyle.push(`text-align: right`);
			cellStyle.push(`padding-right: 1.5em`);
		}

		const cell = {
			style: cellStyle.join(";"),
			class: cellClass.join(" ")
		};

		return { header, cell };
	}

	getField(field) {
		return ({
			label: field.label,
			isNameField: field.isNameField,
			fieldName: field.apiName,
			fieldType: field.type,
			isNumeric: field.isNumeric,
			isLookup: field.isLookup,
			relationshipName: field.relationshipName,
			relatedTo: field.isLookup ?
				{
					apiName: field.relatedToApiName,
					nameFieldApiName: field.relatedToNameFieldApiName
				} :
				null,
			minInt: 1,
			minFrac: 2,
			maxFrac: 2,
			type: "record",
			isSortable: true,
			sortByFieldName: field.apiName,
			isSorting: false,
			isSortDesc: false,
			styles: {
				header: {},
				cell: {}
			}
		});
	}
}