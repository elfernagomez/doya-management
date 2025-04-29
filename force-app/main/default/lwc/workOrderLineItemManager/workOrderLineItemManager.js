import WorkOrderLineItemManagerBase from 'c/workOrderLineItemManagerBase';
import { api, wire } from 'lwc';
import {
	getRelatedListRecords
} from "lightning/uiRelatedListApi";
import {
	getFieldValue,
	createRecord,
	updateRecord,
	deleteRecord
} from 'lightning/uiRecordApi';
import {
	isItemNew,
	applyProcedureRecord,
	applyStatusFlags
} from "c/lineItemManagerStep";

import detailsView from "./details.html";
import compactView from "./compact.html";

import WORK_ORDER_LINE_ITEM_OBJECT from '@salesforce/schema/WorkOrderLineItem';

/**
 * @author Fernando Gomez
 * @since 3/28/2023
 * @versino 1.0
 */
export default class WorkOrderLineItemManager extends WorkOrderLineItemManagerBase {
	@api
	details = {
		parentRecordId: this.recordId,
		items: []
	};

	@api
	variant = "details"; // details, compact

	@api
	get selectedItemId() {
		return this._selectedItemId;
	}

	set selectedItemId(value) {
		this._selectedItemId = value;
		this.setSelectedItem();
	}

	_selectedItemId;

	get title() {
		return `Steps`;
	}

	get subtitle() {
		return ``;
	}

	render() {
		switch (this.variant) {
			case "compact":
				return compactView;
			case "details":
				return detailsView;
			default:
				return compactView;
		}
	}

	@wire(getRelatedListRecords, {
		parentRecordId: "$recordId",
		relatedListId: "WorkOrderLineItems",
		fields: "$fieldApiNames"
	})
	wiredWorkOrder({ error, data }) {
		if (data) {
			// we got data so, we are ready
			data.records.forEach(r => {
				let record = {"Id": r.id};
				let procedureRecord = r.fields.Procedure__r?.value;
				
				// create a one level record with all field values
				this.fields.forEach(f =>
					record[f] = getFieldValue(r, this.getFieldFullName(f)));
				
				// we convert the record into an item
				let item = this.getFromRecord(record);
				
				// and apply the procedure
				if (procedureRecord)
					applyProcedureRecord(item, procedureRecord);

				// the item may be selected
				item.isSelected =
					this.selectedItemId != null &&
					item.uniqueId == this.selectedItemId;

				applyStatusFlags(item);
				this.details.items.push(item);
			});

			// and set the ready status
			this.isReady = true;
		} else if (error)
			this.addError("Error retrieving related line items", error);
	}

	handleItemCreated(event) {
		let item = event.detail.item;
		if (this.isItemReadyToSave(item))
			this.saveItem(item);
	}

	handleItemDelete(event) {
		let item = event.detail.item;
		if (!isItemNew(item))
			this.deleteItem(item);
	}

	deleteItem(item) {
		deleteRecord(item.uniqueId)
			.then(result => {})
			.catch(e => {});
	}


	updateItem(item, updateUniqueId = false, newUniqueId = null) {
		this.getComponent("c-line-item-manager").updateItem(
			item.uniqueId,
			item,
			true,
			updateUniqueId,
			newUniqueId);
	}

	setSelectedItem() {
		if (this.details.items.length) {
			const currentlySelectedItem =
				this.details.items.find(item => item.isSelected);

			// we remove the currently selected item
			if (currentlySelectedItem) {
				currentlySelectedItem.isSelected = false;
				this.updateItem(currentlySelectedItem);
			}

			if (this.selectedItemId) {
				const newlySelectedItem =
					this.details.items.find(
						item => item.uniqueId == this.selectedItemId);

				// we marke the one selected if any
				if (newlySelectedItem) {
					newlySelectedItem.isSelected = true;
					this.updateItem(newlySelectedItem);
				}
			}
		}
	}
}