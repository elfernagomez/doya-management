import LwcBase from "c/lwcBase";
import { NavigationMixin } from 'lightning/navigation';
import { api, track } from "lwc";
import { getProcedureFromRecord } from "c/procedureConfiguration";
import { lineItemManagerLabels } from "c/constants";
import { selectStaff } from 'c/staffSelector';

import detailsView from "./details.html";
import compactView from "./compact.html";
import fieldsView from "./fields.html";
import styles from "./styles.css";

export const STATUS_COMPLETED = "Completed";
export const STATUS_IN_PROGRESS = "In Progress";
export const STATUS_NEW = "New";
export const STATUS_PENDING = "Pending";
export const STATUS_ON_HOLD = "On Hold";

export function applyProcedureOption(item, procedureOptions) {
	if (item.procedureId && procedureOptions) {
		setProcedure(item, procedureOptions.find(p => p.value == item.procedureId));
	}
}

export function applyProcedureRecord(item, procedureRecord) {
	if (procedureRecord && getProcedureFromRecord) {
		setProcedure(item, getProcedureFromRecord(procedureRecord));
	}
}

export function setProcedure(item, procedure) {
	if (procedure) {
		item.procedureName = procedure.label;
		item.isMachineNeeded = procedure.isMachineInfoRequired;
		item.productionFields = procedure.productionFields;
		item.machineFilter =
			procedure.machineSkills ? {
				criteria: procedure.machineSkills.map(skill => ({
					fieldPath: "Skills__c",
					operator: "includes",
					value: skill
				}))
			} : null;
	}
}

export function applyStatusFlags(item) {
	item.isPending = item.status == null ||
		item.status == STATUS_NEW ||
		item.status == "Pending";
	item.isInProgress = item.status == STATUS_IN_PROGRESS;
	item.isOnHold = item.status == STATUS_ON_HOLD;
	item.isComplete = item.status == STATUS_COMPLETED;
}

export function cleanProcedureDependencies(item) {
	item.procedureName = null;
	item.isMachineNeeded = false;
	item.machineFilter = null;
	item.productionFields = [];
}

export function createNewItem(
	order,
	procedureId,
	procedureOptions
) {
	let item = {
		uniqueId: `unsaved_${order}`,
		salesforceId: null,
		isEditing: false,
		isBusy: false,
		isDeleting: false,
		isDisabled: false,
		isValid: true,
		hasError: false,
		errorMessage: null,
		errorObject: null,
		isNew: true,
		showAdminNotes: false,
		showProductionNotes: false,
		order,
		isMachineRequired: false,
		machineSkills: null,
		// status flags
		status: STATUS_NEW,
		isPending: false,
		isInProgress: false,
		isOnHold: false,
		isComplete: false,
		// status information
		startedOn: null,
		startedBy: null,
		onHoldOn: null,
		onHoldBy: null,
		completedOn: null,
		completedBy: null,
		// step work information
		procedureId: procedureId,
		procedureName: null,
		procedureStyle: null,
		adminNotes: null,
		productionNotes: null,
		// actual salesforce record
		record: { },
		productionFields: []
	};

	if (procedureId) {
		applyProcedureOption(item, procedureOptions);
	}
	
	applyStatusFlags(item);
	return item;
}

export function isItemNew(item) {
	return item?.uniqueId.startsWith("unsaved_");
}

export function addErrorToItem(item, errorMessage, erroObject) {
	item.hasError = true;
	item.errorMessage = errorMessage;
	item.errorObject = erroObject;
	return item;
}

export function removeErrorFromItem(item) {
	item.hasError = false;
	item.errorMessage = null;
	item.errorObject = null;
	return item;
}

export default class LineItemManagerStep extends NavigationMixin(LwcBase) {
	static stylesheets = [styles];

	@api
	get item() {
		return this._item;
	}

	set item(value) {
		this._item = this.deepClone(value);
		if (this._item.isInProgress) {
			this.isDetailActionsOpen = true;
		}
	}

	@api
	get procedureOptions() {
		return this._procedureOptions;
	}

	set procedureOptions(value) {
		this._procedureOptions = this.deepClone(value);
	}

	@api
	get statusOptions() {
		return this._statusOptions;
	}

	set statusOptions(value) {
		this._statusOptions = this.deepClone(value);
	}

	@api
	variant = "details"; // details, compact

	@api
	get mode() {
		return this._mode;
	}

	set mode(value) {
		this._mode = value;
	}

	@api
	objectApiName = "WorkOrderLineItem";

	@api
	trackChanges = false;

	@api
	isReadOnly = false;

	@track
	_procedureOptions = [];

	@track
	_statusOptions = [];

	@track
	_item;

	_mode = "prod";
	labels = lineItemManagerLabels;
	isDetailActionsOpen = false;

	get isAdmin() {
		return this._mode == "admin";
	}

	get isProd() {
		return this._mode == "prod";
	}

	get baseField() {
		return {
			"order": 1,
			"isRequired": false,
			"isLabelDisabled": false,
			"isRequiredDisabled": false,
			"isText": false,
			"isFromOptions": false,
			"isOptionRestricted": false,
			"isEditionAllowed": false
		};
	}
	
	get procedureField() {
		return {
			...this.baseField,
			"fieldLabel": "Procedure",
			"fieldApiName": "Procedure__c",
			"fieldTitle": "Procedure (Procedure__c)",
			"isRequired": true
		};
	}

	get machineField() {
		return {
			...this.baseField,
			"fieldLabel": "Machine",
			"fieldApiName": "Machine__c",
			"fieldTitle": "Machine (Machine__c)",
			"isRequired": true
		};
	}

	get statusField() {
		return {
			...this.baseField,
			"fieldLabel": "Status",
			"fieldApiName": "Status",
			"fieldTitle": "Status",
			"isRequired": true
		};
	}

	get compledtedOnField() {
		return {
			...this.baseField,
			"fieldLabel": "Comepleted On",
			"fieldApiName": "CompletedOn__c",
			"fieldTitle": "Comepleted On (CompletedOn__c)"
		};
	}

	get compledtedByField() {
		return {
			...this.baseField,
			"fieldLabel": "Comepleted By",
			"fieldApiName": "CompletedBy__c",
			"fieldTitle": "Comepleted By (CompletedBy__c)"
		};
	}

	get startedOnField() {
		return {
			...this.baseField,
			"fieldLabel": "Started On",
			"fieldApiName": "StartedOn__c",
			"fieldTitle": "Started On (StartedOn__c)"
		};
	}

	get startedByField() {
		return {
			...this.baseField,
			"fieldLabel": "Started By",
			"fieldApiName": "StartedBy__c",
			"fieldTitle": "Started By (StartedBy__c)"
		};
	}

	get adminNotesField() {
		return {
			...this.baseField,
			"fieldLabel": "Admin Notes",
			"fieldApiName": "AdminNotes__c",
			"fieldTitle": "Admin Notes (AdminNotes__c)"
		};
	}

	get productionNotesField() {
		return {
			...this.baseField,
			"fieldLabel": "Production Notes",
			"fieldApiName": "ProductionNotes__c",
			"fieldTitle": "Production Notes (ProductionNotes__c)",
			"isEditionAllowed": true
		};
	}

	get detailsProcedureClass() {
		let statusClasses = [
			"slds-var-p-left_small",
			"slds-var-p-right_x-large"
		];

		if (this._item.isInProgress)
			statusClasses.push(
				"inProgress", 
				"slds-var-p-vertical_medium");
		else if (this._item.isComplete)
			statusClasses.push(
				"complete",
				"slds-var-p-vertical_small");
		else
			statusClasses.push(
				"slds-var-p-vertical_medium");

		if (this._item.isSelected)
			statusClasses.push("isSelected");

		return statusClasses.join(" ");
	}

	get compactProcedureClass() {
		let statusClasses = [
			"slds-button",
			"slds-grid_align-center"
		];

		if (this._item.isInProgress)
			statusClasses.push(
				"inProgress",
				"slds-text-color_inverse",
				"slds-button_brand");
		else if (this._item.isComplete)
			statusClasses.push(
				"complete",
				"slds-text-color_inverse");
		else
			statusClasses.push(
				"pending",
				"slds-theme_shade");

		if (this._item.isSelected)
			statusClasses.push("isSelected");

		return statusClasses.join(" ");
	}

	get detailsProcedurePanelClass() {
		let statusClasses = [
			"slds-theme_shade",
			"procedure-panel",
			"details"
		];

		if (this._item.isInProgress)
			statusClasses.push("inProgress");
		else if (this._item.isComplete)
			statusClasses.push("complete");
		/* else
			statusClasses.push(
				"slds-var-p-vertical_medium"); */

		if (this._item.isSelected)
			statusClasses.push("isSelected");

		return statusClasses.join(" ");
	}

	get showDetailsActionsPanel() {
		return !this.isReadOnly && this.showStatusOptions;
	}

	get showStatusOptions() {
		return this._statusOptions?.length > 0;
	}

	render() {
		switch (this.variant) {
			case "compact":
				return compactView;
			case "details":
				return detailsView;
			case "fields":
				return fieldsView;
			default:
				return compactView;
		}
	}

	handleEditProcedureClick() {
		this.navigateToRecord(this._item.procedureId, "view");
	}

	/**
	 * Triggered when inputs are changed
	 * @param {*} event 
	 */
	handleProcedureFieldChange(event) {
		cleanProcedureDependencies(this._item);
		this.processFieldChange(event.target.value, "procedureId", "string");
	}

	handleStatusFieldChange(event) {
		this.processFieldChange(event.target.value, "status", "string");
	}

	/**
	 * Triggered when inputs are changed
	 * @param {*} event 
	 */
	handleFlatFieldChange(event) {
		this.processFieldChange(
			event.target.value,
			event.target.dataset.field,
			event.target.dataset.type);
	}

	handleLookupFieldChange(event) {
		this.processFieldChange(
			event.detail.recordId,
			event.target.dataset.field,
			event.target.dataset.type);
	}

	handleRecordFieldChange(event) {
		let eventInfo = event.detail;
		this.editItem({ record: eventInfo.record });
	}

	handleShowAdminNotesClick() {
		this.editItem({showAdminNotes: true}, true);
	}

	handleHideAdminNotesClick() {
		this.editItem({showAdminNotes: false}, true);
	}

	handleShowProductionNotesClick() {
		this.editItem({showProductionNotes: true}, true);
	}

	handleHideProductionNotesClick() {
		this.editItem({showProductionNotes: false}, true);
	}

	handleDeleteClick() {
		if (this.isItemNew())
			this.customEvent("itemdelete", this.getDetails());
		else
			this.editItem({isDeleting: true}, true);
	}

	handleConfirmDeleteClick() {
		this.customEvent("itemdelete", this.getDetails());
	}

	handleCancelDeleteClick() {
		this.editItem({isDeleting: false}, true);
	}

	handleOnCompleteClick() {
		selectStaff();
	}

	handleOnItemClick() {
		this.customEvent(
			"itemselected",
			this.getDetails(),
			{
				bubbles: true,
				composed: true
			});
	}

	handleOnDetailsActionToggleClick() {
		this.isDetailActionsOpen = !this.isDetailActionsOpen;
	}

	handleOnCompleteStepClick() {
		this.isDetailActionsOpen = false;
		this.customEvent(
			"itemcomeplete",
			this.getDetails(),
			{
				bubbles: true,
				composed: true
			});
	}

	handleOnSetAsCurrentStepClick() {
		this.isDetailActionsOpen = false;
		this.customEvent(
			"iteminprogress",
			this.getDetails(),
			{
				bubbles: true,
				composed: true
			});
	}

	/**
	 * Process changes on inputs
	 * @param {*} val
	 * @param {*} field
	 * @param {*} type
	 */
	processFieldChange(val, field, type) {
		let converted = this.convertToType(val, type);
		let changes = {};
		changes[field] = converted;

		switch (field) {
			case "procedureId":
				this.editItem(changes, true);
				this.applyProcedure();
				break;
			case "status":
				this.editItem(changes, true);
				this.applyStatus();
				break;
			default:
				this.editItem(changes);
				break;
		}
	}

	editItem(changes, skipEvent = false) {
		Object.keys(changes)
			.forEach(k => (this._item[k] = changes[k]));

		if (!skipEvent)
			this.customEvent("itemchange", this.getDetails());
	}

	applyProcedure() {
		applyProcedureOption(this._item, this._procedureOptions);
		this.customEvent("itemchange", this.getDetails());
	}

	applyStatus() {
		applyStatusFlags(this._item);
		this.customEvent("itemchange", this.getDetails());
	}

	startDeletingItem() {
		this.editItem({isDeleting: true});
	}

	stopDeletingItem() {
		this.editItem({isDeleting: false});
	}

	getDetails() {
		return {
			item: this.deepClone(this._item)
		};
	}

	isItemNew() {
		return this._item.uniqueId.startsWith("unsaved_");
	}

	/**
	 * Navigates to the record's page.
	 * NOTE: Assumes current component's class
	 * extends NavigationMixin. If not, an exception
	 * will ne thrown.
	 * @param {*} recordId 
	 * @param {*} action 
	 */
	navigateToRecord(recordId, action) {
		this[NavigationMixin.Navigate]({
			type: 'standard__recordPage',
			attributes: {
				recordId: recordId,
				actionName: action
			},
		});
	}
}