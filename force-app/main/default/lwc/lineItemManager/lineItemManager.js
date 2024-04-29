import LwcBase from "c/lwcBase";
import { track, api, wire } from "lwc";
import { items } from "c/constants";
import getAllProcedures from "@salesforce/apex/Procedure.getAll";

const PROCEDURE_DETAIL_NOT_NEEDED = "No Details Needed";

/**
 * @author Fernando Gomez
 * @since 3/28/2023
 * @versino 1.0
 */
export default class LineItemManager extends LwcBase {
	@api
	get details() {
		return this.getDetails();
	}

	set details(_details) {
		let clone = JSON.parse(JSON.stringify(_details));
		this.items = clone.items || [];
		this.deletedIds = clone.deletedIds || [];
	}

	@api
	title = 'Items';

	@track
	items = [];

	@track
	deletedIds = [];

	@track
	procedureOptions = [];

	labels = items;
	locals = { };

	isError = false;
	errorTitle;
	errorObject;

	get hasItems() {
		return this.items != null && this.items.length > 0;
	}

	@wire(getAllProcedures)
	wiredProcedureOptions({ data, error }) {
		if (data)
			this.procedureOptions = data;
		else if (error)
			this.addError("Error retrieving available Procedures", error);
	}

	/**
	 * Triggered when inputs are changed
	 * @param {*} event 
	 */
	handleLookupFieldChange(event) {
		this.processFieldChange(
			event.detail.recordId,
			event.target.dataset.field,
			event.target.dataset.type,
			event.target.dataset.src,
			event.target.dataset.index);
	}

	/**
	 * Triggered when inputs are changed
	 * @param {*} event 
	 */
	handleFlatFieldChange(event) {
		this.processFieldChange(
			event.target.value,
			event.target.dataset.field,
			event.target.dataset.type,
			event.target.dataset.src,
			event.target.dataset.index);
	}

	handleRecordFieldChange(event) {
		alert(event.target.value)
		let field = event.target.dataset.field;
		let index = event.target.dataset.index;
		this.items[index].record[field] = event.target.value;
	}

	/**
	 * Process changes on inputs
	 * @param {*} val
	 * @param {*} field
	 * @param {*} type
	 * @param {*} src
	 * @param {*} index
	 */
	processFieldChange(val, field, type, src, index) {
		let converted = this.convertToType(val, type);
		switch (src) {
			case "locals":
				this.locals[field] = converted;
				break;
			case "item":
				let item = {};
				item[field] = converted;
				this.editItem(index, item);

				if (field == "procedureId")
					this.applyProcedure(index);

				break;
		}
	}

	/**
	 * Triggered when Add button is clicke (both)
	 * @param {*} event
	 */
	handleAddItemClick(event) {
		this.addNewItem();
	}

	handleShowNotesClick(event) {
		this.editItem(
			event.target.dataset.index,
			{
				showNotes: true
			});
	}

	handleHideNotesClick(event) {
		this.editItem(
			event.target.dataset.index,
			{
				showNotes: false
			});
	}

	handleOnSwitchItemsOrderClick(event) {
		let index = event.currentTarget.dataset.index;
		this.moveItemUp(index);
	}

	addNewItem() {
		let nextProceId = this.getNextProcedureId();
		this.addItem({
			uniqueId: `unsaved_${this.items.length + 1}`,
			isEditing: true,
			isBusy: false,
			isDeleting: false,
			isDisabled: false,
			isValid: true,
			errorMessage: null,
			isNew: true,
			showNotes: false,
			order: this.items.length + 1,
			showDetails: false,
			detailsField: null,
			isDetailsMachine: false,
			detailsFilter: false,
			// step work information
			procedureId: nextProceId,
			// actual salesforce record
			record: {
				Procedure__c: nextProceId
			}
		});

		// apply the procedure since one might have been applied
		if (nextProceId)
			this.applyProcedure(this.items.length - 1);
	}

	addItem(item) {
		this.items.push(item);
	}

	editItem(index, item) {
		let existent = this.items[index];
		this.items[index] = { ...existent, ...item };
	}

	applyProcedure(index) {
		let item = this.items[index];
		if (item.procedureId) {
			let proc = this.procedureOptions.find(p => p.value == item.procedureId);
			item.showDetails = proc.detailsType != PROCEDURE_DETAIL_NOT_NEEDED;
			item.detailsField = proc.detailsFieldApiName;
			item.isDetailsMachine = item.detailsField == 'Machine__c';
			item.detailsFilter = {
				criteria: [{
					fieldPath: "Skills__c",
					operator: "includes",
					value: proc.label
				}]
			};
		} else {
			item.showDetails = false;
			item.detailsField = null;
			item.isDetailsMachine = false;
			item.detailsFilter = null;
		}
	}

	reportItemsChange() {
		this.dispatchEvent(new CustomEvent('itemschange', {
			detail: this.getDetails()
		}));
	}

	adjustItemsOrder() {
		this.items.forEach((item, index) => item.order = index + 1);
	}

	getDetails() {
		return {
			items: this.items,
			deletedIds: this.deletedIds
		};
	}

	getNextProcedureId() {
		let lastItem = this.getLastElement(this.items);

		// check if the last item has a default next
		if (lastItem && lastItem.defaultNextId)
			return this.procedureOptions.find(
				p => lastItem.defaultNextId == p.value)?.value;
				
		return null;
	}

	moveItemUp(index) {
		if (index > 0) {
			let item = this.items[index];
			let previousItem = this.items[index - 1];
			// we switch the positions
			this.items[index - 1] = item;
			this.items[index] = previousItem;
			// we have to fix the order number
			// but we can't ddo it now since it
			// will be confusing to the user...
			// we wait a bit
			setTimeout(() => this.adjustItemsOrder(), 1000);
		}
	}

	addError(message, error) {
		console.error(error);
		this.isError = true;
		this.errorTitle = message;
		this.errorObject = error;
	}
}