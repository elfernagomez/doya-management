import LwcBase from 'c/lwcBase';
import { api, wire } from 'lwc';
import {
	getObjectInfo
} from "lightning/uiObjectInfoApi";
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
	createNewItem,
	isItemNew,
	addErrorToItem,
	removeErrorFromItem,
	applyProcedureRecord
} from "c/lineItemManagerStep";

import PRODUCTION_ORDER_INE_ITEM_OBJECT
	from '@salesforce/schema/ProductionOrderLineItem__c';

import PROCEDURE_NAME_FIELD from
	"@salesforce/schema/ProductionOrderLineItem__c.Procedure__r.Name";
import PROCEDURE_COLOR_CSS_CODE_FIELD from
	"@salesforce/schema/ProductionOrderLineItem__c.Procedure__r.ColorCssCode__c";
import PROCEDURE_DEFAULT_NEXT_FIELD from
	"@salesforce/schema/ProductionOrderLineItem__c.Procedure__r.DefaultNextProcedure__c";
import PROCEDURE_IS_MACHINE_REQUIRED_FIELD from
	"@salesforce/schema/ProductionOrderLineItem__c.Procedure__r.IsMachineInfoRequired__c";
import PROCEDURE_MACHINE_SKILLS_FIELD from
	"@salesforce/schema/ProductionOrderLineItem__c.Procedure__r.MachineSkills__c";
import PROCEDURE_PRODUCTION_FIELDS_JSON_FIELD from
	"@salesforce/schema/ProductionOrderLineItem__c.Procedure__r.ProductionFieldsJson__c";

/**
 * @author Fernando Gomez
 * @since 3/28/2023
 * @versino 1.0
 */
export default class ProductionOrderStepManager extends LwcBase {
	@api
	recordId;

	@api
	details = {
		parentRecordId: this.recordId,
		items: []
	};

	isReady = false;
	fields = [];
	fieldApiNames = [];

	get title() {
		return `Steps`;
	}

	get subtitle() {
		return ``;
	}

	@wire(getObjectInfo, {
		objectApiName: PRODUCTION_ORDER_INE_ITEM_OBJECT
	})
	wiredObjectInfo({ error, data }) {
		if (data) {
			// we need a list of fields for the query
			this.fields =
				Object.getOwnPropertyNames(data.fields)
					.filter(f => data.fields[f].updateable);
			this.fieldApiNames = [
				...this.fields.map(f => this.getFieldFullName(f)),
				this.getFieldFullName(PROCEDURE_NAME_FIELD.fieldApiName),
				this.getFieldFullName(PROCEDURE_COLOR_CSS_CODE_FIELD.fieldApiName),
				this.getFieldFullName(PROCEDURE_DEFAULT_NEXT_FIELD.fieldApiName),
				this.getFieldFullName(PROCEDURE_IS_MACHINE_REQUIRED_FIELD.fieldApiName),
				this.getFieldFullName(PROCEDURE_MACHINE_SKILLS_FIELD.fieldApiName),
				this.getFieldFullName(PROCEDURE_PRODUCTION_FIELDS_JSON_FIELD.fieldApiName)
			];
		} else if (error)
			this.addError("Error retrieving Work Order Line Item fields", error);
	}

	@wire(getRelatedListRecords, {
		parentRecordId: "$recordId",
		relatedListId: "ProductionOrderLineItems__r",
		fields: "$fieldApiNames",
		sortBy: ["ProductionOrderLineItem__c.StepNumber__c"],
		pageSize: 1000
	})
	wiredProductionOrderLineItems({ error, data }) {
		if (data) {
			this.details.items = [];

			// we got data so, we are ready
			data.records.forEach(r => {
				let record = {"Id": r.id};
				let procedureRecord = r.fields.Procedure__r.value;
				// create a one level record with all field values
				this.fields.forEach(f =>
					record[f] = getFieldValue(r, this.getFieldFullName(f)));
				// we convert the record into an item
				let item = this.getFromRecord(record);
				// and apply the procedure
				applyProcedureRecord(item, procedureRecord);
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

	handleItemChange(event) {
		let item = event.detail.item;
		if (this.isItemReadyToSave(item))
			this.saveItem(item);
	}

	handleItemDelete(event) {
		let item = event.detail.item;
		if (!isItemNew(item))
			this.deleteItem(item);
	}

	saveItem(item) {
		this.removeErrorFromItem(item);
		let record = this.convertToRecord(item);

		if (isItemNew(item))
			createRecord({
				apiName: PRODUCTION_ORDER_INE_ITEM_OBJECT.objectApiName,
				fields: {
					...record,
					ProductionOrder__c: this.recordId
				}
			})
			.then(result => this.updateItem({
				...item,
				uniqueId: result.id
			}))
			.catch(error =>
				this.addErrorToItem(
					item,
					"Item was not created",
					error));
		else
			updateRecord({
				fields: record
			})
			//.then(result => {})
			.catch(error =>
				this.addErrorToItem(
					item,
					"Item was not saved",
					error));
	}

	deleteItem(item) {
		deleteRecord(item.uniqueId)
			.then(result => {})
			.catch(e => {});
	}

	isItemReadyToSave(item) {
		return item.procedureId != null;
	}

	getFromRecord(record) {
		let item = {
			...createNewItem(),
			uniqueId: record.Id,
			salesforceId: record.Id,
			order: record.StepNumber__c,
			// status flags
			isPending: record.Status__c == null || record.Status__c == "Pending",
			isInProgress: record.Status__c == "In Progress",
			isOnHold: record.Status__c == "On Hold",
			isComplete: record.Status__c == "Complete",
			// status information
			startedOn: record.StartedOn__c ?
				new Date(record.StartedOn__c) :
				null,
			startedBy: record.StartedBy__c,
			onHoldOn: record.OnHoldOn__c ?
				new Date(record.OnHoldOn__c) :
				null,
			onHoldBy: record.OnHoldBy__c,
			completedOn: record.CompletedOn__c ?
				new Date(record.CompletedOn__c) :
				null,
			completedBy: record.CompletedBy__c,
			// step work information
			procedureId: record.Procedure__c,
			machineId: record.Machine__c,
			adminNotes: record.AdminNotes__c,
			productionNotes: record.ProductionNotes__c,
			// actual salesforce record
			record: {...record}
		};
	
		return item;
	}

	convertToRecord(item) {
		let record = {
			...item.record,
			StepNumber__c: item.order,
			Procedure__c: item.procedureId,
			Machine__c: item.machineId,
			AdminNotes__c: item.adminNotes,
			ProductionNotes__c: item.productionNotes
		};
		return record;
	}

	addErrorToItem(item, errorTitle, errorObject) {
		let msg = [
			errorTitle,
			...this.getDmlErrors(errorObject)
		].join(". ");
		this.updateItem(addErrorToItem(item, msg, errorObject));
	}

	removeErrorFromItem(item) {
		this.updateItem(removeErrorFromItem(item));
	}

	updateItem(item) {
		this.getComponent("c-line-item-manager").updateItem(item.uniqueId, item);
	}

	getFieldFullName(f) {
		return `${PRODUCTION_ORDER_INE_ITEM_OBJECT.objectApiName}.${f}`;
	}
}