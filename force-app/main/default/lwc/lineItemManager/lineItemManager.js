import LwcBase from "c/lwcBase";
import { track, api, wire } from "lwc";
import { lineItemManagerLabels } from "c/constants";
import getAllProcedures from "@salesforce/apex/Procedure.getAll";
import { getRecords } from 'lightning/uiRecordApi';
import { getProcedureFromRecord, getFieldNames } from "c/procedureConfiguration";
import { createNewItem, applyProcedureOption } from "c/lineItemManagerStep";

/**
 * @author Fernando Gomez
 * @since 3/28/2023
 * @version 1.0
 */
export default class LineItemManager extends LwcBase {
	@api
	get details() {
		return this.getDetails();
	}

	set details(_details) {
		let clone = JSON.parse(JSON.stringify(_details));
		this.items = clone.items || [];
		this.parentRecordId = clone.parentRecordId;
	}

	@api
	title = 'Items';

	/**
	 * Add the specified changes to the item in the internal list.
	 * The item is found by uniqueId. Set skiEvent to false if
	 * the event sent when an item is updated is still necessary
	 * @param {*} id
	 * @param {*} changes
	 * @param {*} skipEvent
	 */
	@api
	updateItem(id, changes, skipEvent = true) {
		let index = this.items.findIndex(i => i.uniqueId == id);
		if (index != -1)
			// skip the event
			this.editItem(index, changes, skipEvent);
	}

	@track
	items = [];

	@track
	deletedIds = [];

	@track
	procedureOptions = [];

	@track
	wiredProcedureParameter;

	parentRecordId;
	labels = lineItemManagerLabels;
	locals = { };
	mode = "prod";

	get hasItems() {
		return this.items != null && this.items.length > 0;
	}

	get modeOptions() {
		return [{
			label: "Admin",
			value: "admin"
		}, {
			label: "Production",
			value: "prod"
		}];
	}

	get isAdmin() {
		return this.mode == "admin";
	}

	@wire(getAllProcedures)
	wiredProcedureOptions({ data, error }) {
		if (data) {
			this.wiredProcedureParameter = data.map(id => ({
				recordIds: [id],
				fields: getFieldNames()
			}));
		} else if (error)
			this.addError("Error retrieving available Procedures", error);
	}

	@wire(getRecords, {
		records: "$wiredProcedureParameter"
	})
	wiredRecords({ error, data }) {
		if (data) {
			this.procedureOptions = data.results.map(
				result => getProcedureFromRecord(result.result));
		} else if (error) {
			console.log("error: ", error);
		}
	}

	handleModeChange(event) {
		this.mode = event.target.value;
	}

	/**
	 * Triggered when Add button is clicke (both)
	 * @param {*} event
	 */
	handleAddItemClick() {
		this.addNewItem();
	}

	handleSwitchItemsOrderClick(event) {
		let index = parseInt(event.currentTarget.dataset.index);
		this.moveItemUp(index);
	}

	handleItemChange(event) {
		let index = parseInt(event.target.dataset.index);
		this.editItem(index, event.detail.item);
	}

	handleItemDelete(event) {
		let index = parseInt(event.target.dataset.index);
		this.deleteItem(index);
	}

	addNewItem() {
		this.addItem(
			createNewItem(
				this.items.length + 1,
				this.getNextProcedureId()));
	}

	addItem(item) {
		this.items.push(item);
		this.customEvent("itemcreate", { item });
	}

	editItem(index, changes, skipEvent = false) {
		let existent = this.items[index];
		let item = (this.items[index] = { ...existent, ...changes });
		if (!skipEvent)
			this.customEvent("itemchange", { item });
	}

	deleteItem(index) {
		let item = this.items[index];
		this.items.splice(index, 1);
		this.customEvent("itemdelete", { item });
		setTimeout(() => {
			// the order field of the next item must be adjusted...
			let item = this.items[index];
			// the next now will ne in the same place as the deleted one
			if (item)
				this.editItem(index, { order: index + 1 });
		}, 1000);
	}

	getDetails() {
		return {
			parentRecordId: this.parentRecordId,
			items: this.items
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
			// but we can't do it now since it
			// will be confusing to the user...
			// we wait a bit
			setTimeout(() => {
				this.editItem(index - 1, { order: index });
				this.editItem(index, { order: index + 1 });
			}, 1000);
		}
	}
}