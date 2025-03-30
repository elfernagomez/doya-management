import InputBase from 'c/inputBase';
import { track, api, wire } from "lwc";
import { fieldMultiSelectorLabels } from "c/constants";
import { getObjectInfo } from "lightning/uiObjectInfoApi";
import {
	getRecord,
	updateRecord,
	notifyRecordUpdateAvailable
} from 'lightning/uiRecordApi';

export default class FieldMultiSelector extends InputBase {
	@api
	recordId;

	@api
	objectApiName;

	@api
	sourceObjectApiName;

	@api
	resultFieldApiName;

	@api
	title = fieldMultiSelectorLabels.defaultTitle;

	@api
	excludedFields = [];

	labels = fieldMultiSelectorLabels;

	wiredRecordId;
	isLoading = false;
	isError = false;
	errorTitle;
	errorObject;

	objectInfo;
	fieldOptions;

	@track
	fields = [];

	isSaveDisabled = true;

	get hasFields() {
		return this.fields.length > 0;
	}

	get recoredWiredFields() {
		return [`${this.objectApiName}.${this.resultFieldApiName}`];
	}

	get modeOptions() {
		return this.variantOptions;
	}

	@wire(getObjectInfo, {
		objectApiName: "$sourceObjectApiName"
	})
	wiredObjectInfo({ error, data}) {
		if (data) {
			this.objectInfo = data;
			this.fieldOptions =
				Object.keys(data.fields)
					.filter(f =>
						data.fields[f].updateable &&
						this.excludedFields.indexOf(data.fields[f].apiName) == -1
					)
					.map(f => ({
						label: this._getFieldTitle(
							data.fields[f].label, data.fields[f].apiName),
						name: data.fields[f].label,
						value: data.fields[f].apiName
					}));

			this.wiredRecordId = this.recordId;
		} else if (error)
			this.addError("Error retrieving available fields", error);
	}

	@wire(getRecord, {
		recordId: "$wiredRecordId",
		fields: "$recoredWiredFields"
	})
	wiredCurrentRecord({ error, data }) {
		if (data) {
			let json = data.fields[this.resultFieldApiName].value;
			this.fields = JSON.parse(json) || [];
		} else if (error)
			this.addError("Error retrieving current record", error);
	}

	handleOnModeChange(event) {
		this.variant = event.detail.value;
	}

	handleAddFieldClick() {
		this.fields.push({
			order: this.fields.length + 1,
			fieldLabel: null,
			fieldApiName: null,
			fieldTitle: null,
			isRequired: true,
			isLabelDisabled: true,
			isRequiredDisabled: true,
			isEditionAllowed: true,
			isEditionAllowedDisabled: false,
			isText: false,
			isFromOptions: false,
			isOptionRestricted: false,
			options: []
		});
		this.isSaveDisabled = false;
	}
	
	handleFieldChange(event) {
		let info = this.objectInfo.fields[event.target.value];
		let field = this.fields[event.target.dataset.index];
		field.fieldApiName = info.apiName;
		field.fieldLabel = info.label;
		field.fieldTitle = this._getFieldTitle(info.label, info.apiName);
		field.isLabelDisabled = false;
		field.isRequiredDisabled = info.required;
		field.isRequired = info.required == true;
		field.isText = info.dataType == "String";
		field.isFromOptions = false;
		field.options = [];
		this.isSaveDisabled = false;
	}

	handleChange(event) {
		let field = this.fields[event.target.dataset.index];
		field[event.target.dataset.field] = 
			event.target.type == "checkbox" ?
				event.target.checked :
				this.convertToType(
					event.target.value,
					event.target.dataset.type);
		this.isSaveDisabled = false;
		// this.logAsStringPretty(field.options);
	}

	handleFieldOptionsChange(event) {
		let field = this.fields[event.target.dataset.index];
		field.options = event.detail.value;
		this.isSaveDisabled = false;
	}

	handleOnCancelClick() {
		this.variant = "view";
	}

	handleOnDeleteClick(event) {
		let index = event.target.dataset.index;
		this.fields.splice(index, 1);
		this.isSaveDisabled = false;
		setTimeout(() => this.adjustFieldsOrder(), 1000);
	}

	handleOnSwitchFieldsOrderClick(event) {
		let index = event.currentTarget.dataset.index;
		this.moveItemUp(index);
	}

	handleOnSaveClick() {
		if (this.validateInputs(".validate") &&
				this.validateDuplicates())
			this.save();
	}

	addError(message, error) {
		console.error(error);
		this.isError = true;
		this.errorTitle = message;
		this.errorObject = error;
	}

	adjustFieldsOrder() {
		this.fields.forEach((field, index) => field.order = index + 1);
	}

	moveItemUp(index) {
		if (index > 0) {
			let field = this.fields[index];
			let previousField = this.fields[index - 1];
			// we switch the positions
			this.fields[index - 1] = field;
			this.fields[index] = previousField;
			// we have to fix the order number
			// but we can't ddo it now since it
			// will be confusing to the user...
			// we wait a bit
			setTimeout(() => this.adjustFieldsOrder(), 1000);
		}
	}

	save() {
		this.isLoading = true;
		let record = {};
		record["Id"] = this.recordId;
		record[this.resultFieldApiName] = JSON.stringify(this.fields);

		updateRecord({
			fields: record
		})
		.then(() => {
			this.isLoading = false;
			this.showSaveSuccessMsg = true;
			this.isSaveDisabled = true;
			notifyRecordUpdateAvailable([{recordId: this.recordId}]);
			setTimeout(() => this.isSaveDisabled = false, 2000);
			this.customEvent("save", {
				recordId: this.recordId,
				record: record
			});
		})
		.catch((error) => {
			console.error(error);
			this.isLoading = false;
			this.addError("There was a problem while Saving", error);
		});
	}

	_getFieldTitle(label, apiName) {
		return `${label} (${apiName})`
	}

	validateDuplicates() {
		let isValid = true;
		let mapped = this.fields.reduce((acc, curr) => {
			if (acc[curr.fieldApiName] == null)
				acc[curr.fieldApiName] = 1;
			else
				acc[curr.fieldApiName]++;

			return acc;
		}, {});

		this.fields.forEach(f => {
			if (mapped[f.fieldApiName] > 1) {
				isValid = false;
				f.isError = true;
				f.errorMsg = "Field selected more than once.";
			} else {
				delete f.isError;
				delete f.errorMsg;
			}
		});

		return isValid;
	}
}