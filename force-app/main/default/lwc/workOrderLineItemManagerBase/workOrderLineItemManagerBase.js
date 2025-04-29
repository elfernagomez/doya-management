import LwcBase from 'c/lwcBase';
import { api, wire } from 'lwc';
import {
	getObjectInfo
} from "lightning/uiObjectInfoApi";
import {
	createRecord,
	updateRecord
} from 'lightning/uiRecordApi';
import {
	createNewItem,
	isItemNew,
	addErrorToItem,
	removeErrorFromItem,
} from "c/lineItemManagerStep";

import {
	getPicklistValues
} from "lightning/uiObjectInfoApi";

import WORK_ORDER_LINE_ITEM_OBJECT from '@salesforce/schema/WorkOrderLineItem';

import WO_LINE_ITEM_STATUS_FIELD
	from "@salesforce/schema/WorkOrderLineItem.Status";
import WO_LINE_ITEM_NAME_FIELD from
	"@salesforce/schema/WorkOrderLineItem.Procedure__r.Name";
import WO_LINE_ITEM_COLOR_CSS_CODE_FIELD from
	"@salesforce/schema/WorkOrderLineItem.Procedure__r.ColorCssCode__c";
import WO_LINE_ITEM_DEFAULT_NEXT_FIELD from
	"@salesforce/schema/WorkOrderLineItem.Procedure__r.DefaultNextProcedure__c";
import WO_LINE_ITEM_IS_MACHINE_REQUIRED_FIELD from
	"@salesforce/schema/WorkOrderLineItem.Procedure__r.IsMachineInfoRequired__c";
import WO_LINE_ITEM_MACHINE_SKILLS_FIELD from
	"@salesforce/schema/WorkOrderLineItem.Procedure__r.MachineSkills__c";
import WO_LINE_ITEM_PRODUCTION_FIELDS_JSON_FIELD from
	"@salesforce/schema/WorkOrderLineItem.Procedure__r.ProductionFieldsJson__c";

export default class WorkOrderLineItemManagerBase extends LwcBase {
	@api
	recordId;

	@api
	variant = "details";

	isReady = false;
	fields = [];
	fieldApiNames = [];
	statusOptions = [];

	@wire(getObjectInfo, {
		objectApiName: WORK_ORDER_LINE_ITEM_OBJECT
	})
	wiredObjectInfo({ error, data }) {
		if (data) {
			// we need a list of fields for the query
			this.fields =
				Object.getOwnPropertyNames(data.fields)
					.filter(f => data.fields[f].updateable);

			this.fieldApiNames = [
				...this.fields.map(f => this.getFieldFullName(f)),
				this.getFieldFullName(
					WO_LINE_ITEM_NAME_FIELD.fieldApiName),
				this.getFieldFullName(
					WO_LINE_ITEM_COLOR_CSS_CODE_FIELD.fieldApiName),
				this.getFieldFullName(
					WO_LINE_ITEM_DEFAULT_NEXT_FIELD.fieldApiName),
				this.getFieldFullName(
					WO_LINE_ITEM_IS_MACHINE_REQUIRED_FIELD.fieldApiName),
				this.getFieldFullName(
					WO_LINE_ITEM_MACHINE_SKILLS_FIELD.fieldApiName),
				this.getFieldFullName(
					WO_LINE_ITEM_PRODUCTION_FIELDS_JSON_FIELD.fieldApiName)
			];
		} else if (error)
			this.addError("Error retrieving Work Order Line Item fields", error);
	}
	
	@wire(getPicklistValues, {
		recordTypeId: "012000000000000AAA",
		fieldApiName: WO_LINE_ITEM_STATUS_FIELD
	})
	wiredStatusPicklistValues({ data }) {
		if (data)
			this.statusOptions = data.values;
	}

	handleItemChange(event) {
		let item = event.detail.item;
		if (this.isItemReadyToSave(item))
			this.saveItem(item);
	}

	isItemReadyToSave(item) {
		return item.procedureId != null;
	}
	
	saveItem(item) {
		let apiName = WORK_ORDER_LINE_ITEM_OBJECT.objectApiName;
		let fields = this.convertToRecord(item);
		this.removeErrorFromItem(item);

		if (isItemNew(item)) {
			fields.WorkOrderId = this.recordId;
			createRecord({
				apiName,
				fields
			})
			.then(result => this.updateItem(item, true, result.id))
			.catch(error => this.addErrorToItem(item, "Item was not created", error));
		} else {
			fields.Id = item.uniqueId;
			updateRecord({
				fields
			})
			.then(result => {})
			.catch(error => this.addErrorToItem(item, "Item was not saved", error));
		}
	}

	updateItem(item, updateUniqueId = false, newUniqueId = null) {
		// to override
	}

	convertToRecord(item) {
		let record = {
			...item.record,
			Order__c: item.order,
			Status: item.status,
			Procedure__c: item.procedureId,
			Machine__c: item.machineId,
			AdminNotes__c: item.adminNotes,
			ProductionNotes__c: item.productionNotes
		};
		return record;
	}

	getFromRecord(record) {
		let item = {
			...createNewItem(),
			uniqueId: record.Id,
			salesforceId: record.Id,
			order: record.Order__c ?? 1,
			// status flags
			status: record.Status,
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

	getFieldFullName(f) {
		return `${WORK_ORDER_LINE_ITEM_OBJECT.objectApiName}.${f}`;
	}
}