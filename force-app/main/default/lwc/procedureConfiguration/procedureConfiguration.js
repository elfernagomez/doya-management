import LwcBase from "c/lwcBase";
import { api, wire } from "lwc";
import { getRecord } from 'lightning/uiRecordApi';
import { procedureConfigurationLabels } from "c/constants";

export default class ProcedureConfiguration extends LwcBase {
	@api
	recordId;

	objectApiName = "Procedure__c";
	labels = procedureConfigurationLabels;

	previewMode = "view";
	isReady = false;
	previewItems = null;
	procedureName;

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

	@wire(getRecord, {
		recordId: "$recordId",
		fields: [
			"Procedure__c.Id",
			"Procedure__c.Name",
			"Procedure__c.AdminFieldsJson__c",
			"Procedure__c.ProductionFieldsJson__c",
			"Procedure__c.IsMachineInfoRequired__c",
			"Procedure__c.MachineSkill__c",
			"Procedure__c.OwnerId"
		]
	})
	wiredCurrentRecord({ error, data }) {
		if (data) {
			this.procedureName = data.fields.Name.value;
			let adminFields = JSON.parse(
				data.fields.AdminFieldsJson__c.value || "[]");
			let prodFields = JSON.parse(
				data.fields.ProductionFieldsJson__c.value || "[]");

			let template = {
				uniqueId: `unsaved_$1`,
				isEditing: false,
				isBusy: false,
				isDeleting: false,
				isDisabled: false,
				isValid: true,
				errorMessage: null,
				isNew: true,
				showNotes: false,
				order: 1,
				showDetails: false,
				detailsField: null,
				isDetailsMachine: false,
				detailsFilter: false,
				// status flags
				isPending: false,
				isNext: false,
				isComplete: false,
				// step work information
				procedureId: this.recordId,
				procedureName: data.fields.Name.value,
				notes: [
					"Sed ut perspiciatis unde omnis iste natus error sit voluptatem",
					"Nemo enim ipsam voluptatem quia voluptas sit aspernatur",
					"Ut enim ad minima veniam, quis nostrum exercitationem ullam"
				].join("\n"),
				// actual salesforce record
				record: {
					Procedure__c: {
						value: this.recordId,
						displayValue: data.fields.Name.value
					},
					...[
						...adminFields,
						...prodFields
					].reduce(
						(obj, f) => {
							obj[f.fieldApiName] = {
								value: null,
								displayValue: `Test ${f.fieldLabel}`
							};
							return obj
						},
						{})
				},
				adminFields,
				prodFields
			};

			this.previewItems = [{
				...template,
				isPending: true
			}, {
				...template,
				isNext: true,
				notes: null
			}, {
				...template,
				isComplete: true,
				notes: "Shorter notes this time."
			}];
		}
	}

	handleOnPreviewClick() {
		this.getComponent(".previewModal").open();
	}

	handlePreviewModeChange(event) {
		this.previewMode = event.detail.value;
	}
}