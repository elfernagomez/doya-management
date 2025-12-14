import LwcBase from "c/lwcBase";
import { api, wire } from "lwc";
import { procedureConfigurationLabels } from "c/constants";
import {
	getRecord,
	getFieldValue,
	updateRecord,
	notifyRecordUpdateAvailable
} from 'lightning/uiRecordApi';

import PROCEDURE_OBJECT
	from '@salesforce/schema/Procedure__c';

import NAME_FIELD from
	"@salesforce/schema/Procedure__c.Name";
import COLOR_CSS_CODE_FIELD from
	"@salesforce/schema/Procedure__c.ColorCssCode__c";
import DEFAULT_NEXT_FIELD from
	"@salesforce/schema/Procedure__c.DefaultNextProcedure__c";
import IS_MACHINE_REQUIRED_FIELD from
	"@salesforce/schema/Procedure__c.IsMachineInfoRequired__c";
import MACHINE_SKILLS_FIELD from
	"@salesforce/schema/Procedure__c.MachineSkills__c";
import PRODUCTION_FIELDS_JSON_FIELD from
	"@salesforce/schema/Procedure__c.ProductionFieldsJson__c";

export const STATUS_NEW = "New";

export function getFieldNames() {
	return [
		`${PROCEDURE_OBJECT.objectApiName}.${NAME_FIELD.fieldApiName}`,
		`${PROCEDURE_OBJECT.objectApiName}.${COLOR_CSS_CODE_FIELD.fieldApiName}`,
		`${PROCEDURE_OBJECT.objectApiName}.${DEFAULT_NEXT_FIELD.fieldApiName}`,
		`${PROCEDURE_OBJECT.objectApiName}.${IS_MACHINE_REQUIRED_FIELD.fieldApiName}`,
		`${PROCEDURE_OBJECT.objectApiName}.${MACHINE_SKILLS_FIELD.fieldApiName}`,
		`${PROCEDURE_OBJECT.objectApiName}.${PRODUCTION_FIELDS_JSON_FIELD.fieldApiName}`
	];
}

export function getProcedureFromRecord(record) {
	return {
		value: record.id,
		label:
			getFieldValue(record, NAME_FIELD),
		colorCode:
			getFieldValue(record, COLOR_CSS_CODE_FIELD) || "#ffffff",
		defaultNextId:
			getFieldValue(record, DEFAULT_NEXT_FIELD),
		isMachineInfoRequired:
			getFieldValue(record, IS_MACHINE_REQUIRED_FIELD),
		machineSkills:
			getFieldValue(record, MACHINE_SKILLS_FIELD)?.split(";") || null,
		productionFields:
			JSON.parse(getFieldValue(record, PRODUCTION_FIELDS_JSON_FIELD) || "[]"),
	};
}

export function getProcedureFromApexRecord(record) {
	return {
		value: record.Id,
		label: record.Name,
		colorCode: record.ColorCssCode__c || "#ffffff",
		defaultNextId: record.DefaultNextProcedure__c,
		isMachineInfoRequired: record.IsMachineInfoRequired__c,
		machineSkills: record.MachineSkills__c?.split(";") || null,
		productionFields: JSON.parse(record.ProductionFieldsJson__c || "[]"),
	};
}

export default class ProcedureConfiguration extends LwcBase {
	@api
	recordId;

	objectApiName = PROCEDURE_OBJECT.objectApiName;
	labels = procedureConfigurationLabels;

	previewMode = "view";
	isReady = false;
	previewItems = null;

	procedureName;
	colorCode = "#ffffff";
	fieldsMode = "view";

	get isFieldsInViewMode() {
		return this.fieldsMode == "view";
	}

	get isFieldsInEditMode() {
		return this.fieldsMode == "edit";
	}

	get previewProcedureOptions() {
		return [{
			label: this.previewItem?.procedureName,
			value: this.recordId
		}];
	}

	get previewModeOptions() {
		return [{
			label: "View",
			value: "view"
		}, {
			label: "Edit",
			value: "edit"
		}];
	}

	get excludedFields() {
		return [
			"Procedure__c",
			"Machine__c"
		];
	}

	@wire(getRecord, {
		recordId: "$recordId",
		fields: [
			NAME_FIELD,
			COLOR_CSS_CODE_FIELD,
			DEFAULT_NEXT_FIELD,
			IS_MACHINE_REQUIRED_FIELD,
			MACHINE_SKILLS_FIELD,
			PRODUCTION_FIELDS_JSON_FIELD
		]
	})
	wiredCurrentRecord({ error, data }) {
		if (data && getProcedureFromRecord) {
			let proc = getProcedureFromRecord(data);
			this.procedureName = proc.label;
			this.colorCode = proc.colorCode;

			/* let template = createNewItem(1, this.recordId, [proc]);
			this.previewItems = [{
				...template,
				isPending: true
			}, {
				...template,
				order: 2,
				isNext: true,
				notes: null
			}, {
				...template,
				order: 3,
				isComplete: true,
				notes: "Shorter notes this time."
			}]; */
		} else if (error) {
			console.error(error);
		}
	}

	handleOnPreviewClick() {
		this.getComponent(".previewModal").open();
	}

	handlePreviewModeChange(event) {
		this.previewMode = event.detail.value;
	}

	handleColorChange(event) {
		let color = event.target.value;
		this.save("ColorCssCode__c", color);
	}

	handleOnEditFieldsClick() {
		this.fieldsMode = "edit";
	}

	handleOnCancelFieldsClick() {
		this.fieldsMode = "view";
	}

	handleOnFieldsSave() {
		this.fieldsMode = "view";
	}

	save(fieldApiName, value) {
		let record = {};
		record["Id"] = this.recordId;
		record[fieldApiName] = value;

		updateRecord({
			fields: record
		})
		.then(() => notifyRecordUpdateAvailable([{recordId: this.recordId}]))
		.catch((error) => {
			console.error(error);
			// this.addError("There was a problem while Saving", error);
		});
	}
}