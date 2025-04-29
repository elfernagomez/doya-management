import WorkOrderListViewEventBus from "c/workOrderListViewEventBus";
import { NavigationMixin } from "lightning/navigation";
import styles from "./styles.css";
import { track, wire } from 'lwc';

import getWorkOrderPage
	from "@salesforce/apex/WorkOrderListViewCtrl.getWorkOrderPage";

export default class WorkOrderListView
		extends NavigationMixin(WorkOrderListViewEventBus) {

	static stylesheets = [styles];

	isLoading = false;
	isAllSelected = false;
	wiredWorkOrderPageResult;
	searchText = null;
	sortBy = "DueDate__c";
	isSortDesc = true;

	baseColumnClasses = [
		"slds-is-resizable",
		"slds-is-sortable",
		"slds-cell_action-mode"
	];

	baseStyleClass = this.baseColumnClasses.join(" ");

	@track
	columns = [{
		label: "Work Order #",
		fieldName: "workOrderNo",
		type: "record",
		style: "width:10%;",
		isSortable: true,
		sortByFieldName: "WorkOrderNumber",
		isSorting: false,
		isSortDesc: false,
		styleClass: null
	}, {
		label: "Order #",
		fieldName: "orderNo",
		type: "record",
		style: "width:10%;",
		isSortable: true,
		sortByFieldName: "Order__r.OrderNumber",
		isSorting: false,
		isSortDesc: false,
		styleClass: null
	}, {
		label: "Order Product",
		fieldName: "productName",
		fieldType: "text",
		type: "object",
		style: "width:15%;",
		isSortable: true,
		sortByFieldName: "OrderProduct__r.Product2.Name",
		isSorting: false,
		isSortDesc: false,
		styleClass: null
	}, {
		label: "Due Date",
		fieldName: "dueDate",
		fieldType: "datetime",
		type: "object",
		style: "width:10%;",
		isSortable: true,
		sortByFieldName: "DueDate__c",
		isSorting: true,
		isSortDesc: true,
		styleClass: null
	}, {
		label: "Material",
		fieldName: "materialName",
		fieldType: "text",
		type: "object",
		style: "width:15%;",
		isSortable: true,
		sortByFieldName: "Material__r.Name",
		isSorting: false,
		isSortDesc: false,
		styleClass: null
	}, {
		label: "Qty",
		fieldName: "qty",
		fieldType: "decimal",
		minInt: 1,
		minFrac: 1,
		maxFrac: 1,
		type: "object",
		style: "width:5%;",
		isSortable: true,
		sortByFieldName: "Quantity__c",
		isSorting: false,
		isSortDesc: false,
		styleClass: null
	}, {
		label: "Width",
		fieldName: "width",
		fieldType: "decimal",
		minInt: 1,
		minFrac: 2,
		maxFrac: 2,
		type: "object",
		style: "width:10%;",
		isSortable: true,
		sortByFieldName: "Width__c",
		isSorting: false,
		isSortDesc: false,
		styleClass: null
	}, {
		label: "Height",
		fieldName: "height",
		fieldType: "decimal",
		minInt: 1,
		minFrac: 2,
		maxFrac: 2,
		type: "object",
		style: "width:10%;",
		isSortable: true,
		sortByFieldName: "Height__c",
		isSorting: false,
		isSortDesc: false,
		styleClass: null
	}, {
		label: "Depth",
		fieldName: "depth",
		fieldType: "decimal",
		minInt: 1,
		minFrac: 2,
		maxFrac: 2,
		type: "object",
		isSortable: true,
		sortByFieldName: "Depth__c",
		isSorting: false,
		isSortDesc: false,
		styleClass: null
	}];

	@track
	data = [];

	pageNumber = 0;
	pageSize = 100;
	filters = {};
	cacheBust = new Date().toISOString();
	rowNumberColumnStyle = "width:3.5rem;";

	@wire(getWorkOrderPage, {
		searchText: "$searchText",
		pageNumber: "$pageNumber",
		pageSize: "$pageSize",
		sortBy: "$sortBy",
		isSortDesc: "$isSortDesc",
		filters: "$filters",
		cacheBust: "$cacheBust"
	})
	wiredWorkOrderPage(result) {
		const { error, data } = result;
		this.wiredWorkOrderPageResult = result;
		if (data) {
			this.isLoading = false;

			if (this.pageNumber == 0)
				this.data = [];

			let order = this.data.length;
			this.data.push(...data.map(record => {
				const w = this.getFromRecord(record);
				return {
					rowNumber: ++order,
					isSelected: false,
					isOpen: false,
					uniqueId: w.uniqueId,
					selectedItemId: null,
					record,
					columns: this.columns.map(c => ({
						key: `${c.fieldName}_${w.uniqueId}`,
						column: c,
						data: {[c.fieldName]: w[c.fieldName]}
					}))
				};
			}));

			this.publishEvent(
				"workOrderPageFetched",
				this.data.map(row => ({
					rowNumber: row.rowNumber,
					uniqueId: row.uniqueId
				})));
		} else if (error) {
			this.isLoading = false;
			this.addError("Error retrieving Work Order", error);
		}
	}

	connectedCallback() {
		this.subscribeToEvents();
		this.updateColumnsRefence();
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
		const index = parseInt(event.currentTarget.dataset.index);
		const isSelected = event.target.checked;
		this.editDataRow(
			index,
			{
				isSelected
			});
		this.calculateIsAllSelected();
	}

	handleOnOpenRowClick(event) {
		const index = parseInt(event.currentTarget.dataset.index);
		const selectedItemId = this.autoSelect(index);
		this.editDataRow(
			index,
			{
				isOpen: true,
				selectedItemId
			});
	}

	handleOnCloseRowClick(event) {
		const index = parseInt(event.currentTarget.dataset.index);
		this.editDataRow(
			index,
			{
				isOpen: false
			});
	}

	handleOnLineItemSelected(event) {
		const index = parseInt(event.currentTarget.dataset.index);
		const selectedItemId = event.detail.item.uniqueId;
		const isItemSelected = this.isItemSelected(index, selectedItemId);
		this.editDataRow(
			index,
			{
				selectedItemId:
					isItemSelected ?
						null :
						selectedItemId
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

	getFromRecord(record) {
		const orderUrl = `/lightning/r/WorkOrder/${record.Order__c}/view`;
		const workOrderUrl = `/lightning/r/WorkOrder/${record.Id}/view`;

		let item = {
			//...createNewItem(),
			uniqueId: record.Id,
			salesforceId: record.Id,
			orderNo: {
				value: record.Order__c,
				displayValue: `<a href="${orderUrl}">${record.Order__r?.OrderNumber}</a>`
			},
			workOrderNo: {
				value: record.WorkOrderNumber,
				displayValue: `<a href="${workOrderUrl}">${record.WorkOrderNumber}</a>`
			},
			productId: record.OrderProduct__r?.Product2Id,
			productName: record.OrderProduct__r?.Product2?.Name,
			materialId: record.Material__c,
			materialName: record.Material__r?.Name,
			dueDate: record.DueDate__c ?
				new Date(record.DueDate__c) :
				null,
			title: record.Title__c,
			width: record.Width__c,
			height: record.Height__c,
			depth: record.Depth__c,
			qty: record.Quantity__c || 1,
			record: {...record}
		};
	
		return item;
	}

	editDataRow(index, changes, updateDataRefence = true) {
		const row = this.data[index];
		this.mergeObjects(row, changes);

		if (updateDataRefence)
			this.updateInnerRefence(index);
	}

	updateColumnsRefence() {
		this.columns.forEach(c => {
			const classes = [this.baseStyleClass];
			if (c.isSorting)
				classes.push("slds-is-sorted");
			if (c.isSortDesc)
				classes.push("slds-is-sorted_desc");
			c.styleClass = classes.join(" ");
		});
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
		else {
			const selectedItem =
				row.record.WorkOrderLineItems != null ?
					(row.record.WorkOrderLineItems.find(
						woli => woli.Status__c == "In Progress") ||
					row.record.WorkOrderLineItems.find(
						woli => woli.Status__c == "New") ||
					row.record.WorkOrderLineItems[0]) :
					null;
			return selectedItem?.Id;
		}
	}

	isItemSelected(index, selectedItemId) {
		const row = this.data[index];
		return row.selectedItemId == selectedItemId;
	}

	calculateIsAllSelected() {
		this.isAllSelected = this.data.every(row => row.isSelected);
	}
}