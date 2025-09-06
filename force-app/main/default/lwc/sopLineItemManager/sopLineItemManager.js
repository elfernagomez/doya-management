import LwcBase from 'c/lwcBase';
import { api, wire } from 'lwc';
import {
	getObjectInfo
} from "lightning/uiObjectInfoApi";
import {
	getRelatedListRecords
} from "lightning/uiRelatedListApi";
import {
	createRecord,
	updateRecord,
	deleteRecord,
	getFieldValue
} from 'lightning/uiRecordApi';
import {
	isItemNew,
	createNewItem,
	applyProcedureRecord,
	applyStatusFlags,
	addErrorToItem,
	removeErrorFromItem
} from "c/lineItemManagerStep";

import SOP_LINE_ITEM_OBJECT from '@salesforce/schema/SopLineItem__c';

import SOP_LINE_ITEM_NAME_FIELD from
	"@salesforce/schema/SopLineItem__c.Procedure__r.Name";
import SOP_LINE_ITEM_COLOR_CSS_CODE_FIELD from
	"@salesforce/schema/SopLineItem__c.Procedure__r.ColorCssCode__c";
import SOP_LINE_ITEM_DEFAULT_NEXT_FIELD from
	"@salesforce/schema/SopLineItem__c.Procedure__r.DefaultNextProcedure__c";
import SOP_LINE_ITEM_IS_MACHINE_REQUIRED_FIELD from
	"@salesforce/schema/SopLineItem__c.Procedure__r.IsMachineInfoRequired__c";
import SOP_LINE_ITEM_MACHINE_SKILLS_FIELD from
	"@salesforce/schema/SopLineItem__c.Procedure__r.MachineSkills__c";
import SOP_LINE_ITEM_PRODUCTION_FIELDS_JSON_FIELD from
	"@salesforce/schema/SopLineItem__c.Procedure__r.ProductionFieldsJson__c";

/**
 * @author Fernando Gomez
 * @since 4/16/2024
 * @versino 1.0
 */
export default class SopLineItemManager extends LwcBase {
	@api
	recordId;

	@api
	details = {
		parentRecordId: this.recordId,
		items: []
	};

	@api
	objectApiName = "SopLineItem__c";
	
	mode = "admin";
	isReady = false;
	fields = [];
	fieldApiNames = [];

	get modeOptions() {
		return [{
			label: "Admin",
			value: "admin",
			isChecked: this.mode == "admin"
		}, {
			label: "Production",
			value: "prod",
			isChecked: this.mode == "prod"
		}];
	}

	get title() {
		return `Steps`;
	}

	get subtitle() {
		return ``;
	}

	@wire(getObjectInfo, {
		objectApiName: SOP_LINE_ITEM_OBJECT
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
					SOP_LINE_ITEM_NAME_FIELD.fieldApiName),
				this.getFieldFullName(
					SOP_LINE_ITEM_COLOR_CSS_CODE_FIELD.fieldApiName),
				this.getFieldFullName(
					SOP_LINE_ITEM_DEFAULT_NEXT_FIELD.fieldApiName),
				this.getFieldFullName(
					SOP_LINE_ITEM_IS_MACHINE_REQUIRED_FIELD.fieldApiName),
				this.getFieldFullName(
					SOP_LINE_ITEM_MACHINE_SKILLS_FIELD.fieldApiName),
				this.getFieldFullName(
					SOP_LINE_ITEM_PRODUCTION_FIELDS_JSON_FIELD.fieldApiName)
			];
		} else if (error)
			this.addError("Error retrieving Work Order Line Item fields", error);
	}

	@wire(getRelatedListRecords, {
		parentRecordId: "$recordId",
		relatedListId: "SopLineItems__r",
		fields: "$fieldApiNames"
	})
	wiredWorkOrderLineItems({ error, data }) {
		if (data) {
			this.details.items =
				// we got data so, we are ready
				data.records.map(r => {
					let record = {"Id": r.id};
					let procedureRecord = r.fields.Procedure__r?.value;
					
					// create a one level record with all field values
					this.fields.forEach(f =>
						(record[f] = getFieldValue(r,
							this.getFieldFullName(f))));
					
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
					return item;
				});

			// and set the ready status
			this.isReady = true;
		} else if (error) {
			this.addError("Error retrieving related line items", error);
		}
	}

	handleOnModeSelect(event) {
		this.mode = event.detail.value;
	}

	handleItemChange(event) {
		try {
		let item = event.detail.item;
		if (this.isItemReadyToSave(item)) {
			this.saveItem(item);
		}
		} catch (e) {
			console.error('Error handling item change',
				JSON.stringify(e.stack));
		}
	}

	handleItemDelete(event) {
		let item = event.detail.item;
		if (!isItemNew(item))
			this.deleteItem(item);
	}

	getFieldFullName(f) {
		return `${SOP_LINE_ITEM_OBJECT.objectApiName}.${f}`;
	}

	getFromRecord(record) {
		let item = {
			...createNewItem(),
			uniqueId: record.Id,
			salesforceId: record.Id,
			order: record.Order__c ?? 1,
			// step work information
			procedureId: record.Procedure__c,
			machineId: record.Machine__c,
			adminNotes: record.AdminNotes__c,
			// productionNotes: record.ProductionNotes__c,
			// actual salesforce record
			record: {...record}
		};
	
		return item;
	}

	isItemReadyToSave(item) {
		return item.procedureId != null;
	}

	saveItem(item) {
		let apiName = SOP_LINE_ITEM_OBJECT.objectApiName;
		let fields = this.convertToRecord(item);
		this.removeErrorFromItem(item);
		
		if (isItemNew(item)) {
			fields.SOP__c = this.recordId;
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
			.catch(error => this.addErrorToItem(item, "Item was not saved", error));
		}
	}

	convertToRecord(item) {
		let record = {
			...item.record,
			Order__c: item.order,
			Procedure__c: item.procedureId,
			Machine__c: item.machineId,
			AdminNotes__c: item.adminNotes,
			Name: [
				item.order,
				item.procedureName
			].join(" | "),
			Title__c: [
				item.order,
				item.procedureName
			].join(" | "),
			// ProductionNotes__c: item.productionNotes
		};
		return record;
	}

	updateItem(item, updateUniqueId = false, newUniqueId = null) {
		this.getComponent("c-line-item-manager").updateItem(
			item.uniqueId,
			item,
			true,
			updateUniqueId,
			newUniqueId);
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

	deleteItem(item) {
		deleteRecord(item.uniqueId);
	}
}