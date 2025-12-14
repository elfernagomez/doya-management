import WorkOrderLineItemManagerBase from 'c/workOrderLineItemManagerBase';
import WorkOrderCompleteStepModal from 'c/workOrderCompleteStepModal';
import { api, wire } from 'lwc';
import {
	updateRecord,
	deleteRecord
} from 'lightning/uiRecordApi';
import {
	isItemNew,
	applyProcedureApexRecord,
	applyStatusFlags,
	STATUS_COMPLETED,
	STATUS_IN_PROGRESS,
	STATUS_PENDING
} from "c/lineItemManagerStep";

import getWorkOrderLineItems
	from "@salesforce/apex/WorkOrderLineItemManagerCtrl.getWorkOrderLineItems";

import detailsView from "./details.html";
import compactView from "./compact.html";

import WO_ID_FIELD from "@salesforce/schema/WorkOrder.Id";
import WO_STATUS_FIELD from "@salesforce/schema/WorkOrder.Status";

/**
 * @author Fernando Gomez
 * @since 3/28/2023
 * @versino 1.0
 */
export default class WorkOrderLineItemManager extends WorkOrderLineItemManagerBase {
	@api
	recordId;

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

	@api
	get selectedItem() {
		return this.details.items.find(item => item.isSelected);
	}

	_selectedItemId;

	get title() {
		return `Steps`;
	}

	get subtitle() {
		return ``;
	}

	get currentStepName() {
		return this.details.items.find(
			item => item.isInProgress)?.procedureName || "";
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

	@wire(getWorkOrderLineItems, {
		workOrderId: "$recordId",
		fields: "$fieldApiNames"
	})
	wiredWorkOrderLineItems({ error, data }) {
		if (data) {
			console.log("wiredWorkOrderLineItems invoked");
			this.details.items =
				// we got data so, we are ready
				data.map(record => {
					let procedureRecord = record.Procedure__r;
					console.log("Loaded line items:", 
						JSON.stringify(record),
						JSON.stringify(procedureRecord));
					
					// we convert the record into an item
					let item = this.getFromRecord(record);
					
					// and apply the procedure
					if (procedureRecord) {
						applyProcedureApexRecord(item, procedureRecord);
					}

					// the item may be selected
					item.isSelected =
						this.selectedItemId != null &&
						item.uniqueId == this.selectedItemId;

					applyStatusFlags(item);
					return item;
				});

			// and set the ready status
			this.isReady = true;
		} else if (error) {
			this.addError("Error retrieving related line items", error);
		}
	}

	@api
	setAsCurrentStep(selectedItemId) {
		// we mark all steps behind this as complete,
		// and the one before as in progress
		// the current elemenet we mark as In Progress
		// we mark the next steps as
		this.setStepsStatus(
			selectedItemId,
			STATUS_COMPLETED,
			STATUS_IN_PROGRESS,
			STATUS_PENDING);
	}

	@api
	setAsCompletedStep(selectedItemId, doCompleteWorkOrder = false) {
		// all we need to do is set the next one
		// as the in progress one
		const currentIndex = this.details.items.findIndex(
			item => item.uniqueId == selectedItemId);
		const nextItem = this.details.items[currentIndex + 1];

		// if we have an item the we set it
		// to In Poregss
		if (nextItem) {
			this.setStepsStatus(
				nextItem.uniqueId,
				STATUS_COMPLETED,
				STATUS_IN_PROGRESS,
				STATUS_PENDING,
				doCompleteWorkOrder);
		} else {
			this.setStepsStatus(
				selectedItemId,
				STATUS_COMPLETED,
				STATUS_COMPLETED,
				STATUS_COMPLETED,
				doCompleteWorkOrder);
		}
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

	handleOnItemSelected(event) {
		const selectedItemId = event.detail.item.uniqueId;
		const selectedItem =
			this.details.items.find(
				item => item.uniqueId == selectedItemId);

		if (selectedItem.isSelected)
			this._selectedItemId = null;
		else
			this._selectedItemId = selectedItemId;
			
		this.setSelectedItem();
	}

	handleOnItemComplete(event) {
		const selectedItemId = event.detail.item.uniqueId;
		const currentIndex = this.details.items.findIndex(
			item => item.uniqueId == selectedItemId);
		const currentItem = this.details.items[currentIndex];
		const nextItem = this.details.items[currentIndex + 1];
		WorkOrderCompleteStepModal.open({
			size: 'small',
			description: 'Complete Work Order Step',
			action: "completeStep",
			currentItem,
			nextItem
		}).then(result => {
			if (result?.confirmed) {
				this.setAsCompletedStep(
					selectedItemId,
					result.completeWorkOrder);
			}
		});
	}

	handleOnItemInProgress(event) {
		const selectedItemId = event.detail.item.uniqueId;
		const currentIndex = this.details.items.findIndex(
			item => item.uniqueId == selectedItemId);
		const currentItem = this.details.items[currentIndex];
		WorkOrderCompleteStepModal.open({
			size: 'small',
			description: 'Set as Current Work Order Step (In Progress)',
			action: "setAsCurrentStep",
			currentItem
		}).then(result => {
			if (result?.confirmed) {
				this.setAsCurrentStep(selectedItemId);
			}
		});
	}

	deleteItem(item) {
		deleteRecord(item.uniqueId);
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

	isItemSelected(index, selectedItemId) {
		const row = this.data[index];
		return row.selectedItemId == selectedItemId;
	}

	setStepsStatus(
		selectedItemId,
		previousStatus,
		currentStatus,
		nextStatus,
		doCompleteWorkOrder = false
	) {
		const currentIndex = this.details.items.findIndex(
			item => item.uniqueId == selectedItemId);

		const previousItems = this.details.items.slice(0, currentIndex);
		const currentItem = this.details.items[currentIndex];
		const nextItems = this.details.items.slice(currentIndex + 1);
		
		previousItems.forEach(item => (item.status = previousStatus));
		currentItem.status = currentStatus;
		nextItems.forEach(item => (item.status = nextStatus));
		this.details.items.forEach(item => {
			applyStatusFlags(item);
			this.updateItem(item);
		});

		// we have to save all items
		this.saveItems(
			this.details.items,
			() => {
				if (doCompleteWorkOrder)
					this.completeWorkOrder();
			}
		);
	}

	completeWorkOrder() {
		const fields = {};
		fields[WO_ID_FIELD.fieldApiName] = this.recordId;
		fields[WO_STATUS_FIELD.fieldApiName] = STATUS_COMPLETED;

		updateRecord({
			fields
		})
		// .then()
		.catch(error =>
			this.addError(
				"Error completing the Work Order",
				error));
	}
}