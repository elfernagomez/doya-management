import LwcBase from "c/lwcBase";
import { NavigationMixin } from 'lightning/navigation';
import { api, track } from "lwc";
import { getProcedureFromRecord } from "c/procedureConfiguration";
import { lineItemManagerLabels } from "c/constants";
import { selectStaff } from 'c/staffSelector';

export function applyProcedureOption(item, procedureOptions) {
	if (item.procedureId && procedureOptions)
		setProcedure(item, procedureOptions.find(p => p.value == item.procedureId));
}

export function applyProcedureRecord(item, procedureRecord) {
	if (procedureRecord)
		setProcedure(item, getProcedureFromRecord(procedureRecord))
}

export function setProcedure(item, procedure) {
	if (procedure) {
		item.procedureName = procedure.label;
		item.procedureStyle = `background-color:${procedure.colorCode}`;
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

export function cleanProcedureDependencies(item) {
	item.procedureName = null;
	item.procedureStyle = null;
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

	if (procedureId)
		applyProcedureOption(item, procedureOptions);

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
	@api
	get item() {
		return this._item;
	}

	set item(value) {
		this._item = this.deepClone(value);
	}

	@api
	get procedureOptions() {
		return this._procedureOptions;
	}

	set procedureOptions(value) {
		this._procedureOptions = this.deepClone(value);
	}

	@api
	variant = "view";

	@api
	get mode() {
		return this._mode;
	}

	set mode(value) {
		this._mode = value;
	}

	@api
	objectApiName = "ProductionOrderLineItem__c";

	@api
	trackChanges = false;

	@track
	_procedureOptions = {};

	@track
	_item;

	_mode = "admin";
	labels = lineItemManagerLabels;

	get isView() {
		return this.variant == "view";
	}

	get isEdit() {
		return this.variant == "edit";
	}

	get isAdmin() {
		return this._mode == "admin";
	}

	get isProd() {
		return this._mode == "prod";
	}

	get machineField() {
		return {
			"order": 1,
			"fieldLabel": "Machine",
			"fieldApiName": "Machine__c",
			"fieldTitle": "Machine (Machine__c)",
			"isRequired": true,
			"isLabelDisabled": false,
			"isRequiredDisabled": false,
			"isText": false,
			"isFromOptions": false,
			"isOptionRestricted": false
		};
	}

	handleEditProcedureClick() {
		this.navigateToRecord(this._item.procedureId, "view");
	}

	/**
	 * Triggered when inputs are changed
	 * @param {*} event 
	 */
	handleProcedureFieldChange(event) {
		cleanProcedureDependencies(this._item)
		this.processFieldChange(event.target.value, "procedureId", "string");
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
			default:
				this.editItem(changes);
				break;
		}
	}

	editItem(changes, skipEvent = false) {
		Object.keys(changes)
			.forEach(k => this._item[k] = changes[k]);

		if (!skipEvent)
			this.customEvent("itemchange", this.getDetails());
	}

	applyProcedure() {
		applyProcedureOption(this._item, this._procedureOptions);
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