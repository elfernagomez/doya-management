import InputBase from 'c/inputBase';
import { api } from "lwc";

export default class ProductionField extends InputBase {
	@api
	field;

	@api
	get record() {
		return this._record;
	}

	set record(v) {
		this._record = { ...v };
	}

	@api
	objectApiName = "WorkOrderLineItem";

	@api
	isReadonly = false;

	@api
	isEditAllowedOverride = null;

	_record = {};
	isEditing = false;
	isFormReady = false;

	get showEdit() {
		return this.isEdit == true ||
			(this.isEditAllowed && this.isEditing == true);
	}

	get recordId() {
		return this.record?.Id || null;
	}

	get value() {
		return this.record[this.field.fieldApiName];
	}

	get options() {
		return (this.field.options || [])
			.map(o => ({
				label: o,
				value: o
			}));
	}

	get isEditAllowed() {
		return this.isFormReady &&
			(this.field.isEditionAllowed == true ||
			(this.isEditAllowedOverride != null &&
				this.isEditAllowedOverride == true));
	}

	get viewModeContainerClass() {
		return this.isEditAllowed ?
			"slds-is-relative slds-var-p-right_medium" :
			""
	}

	get editModeContainerClass() {
		return this.showCloseEditButton ?
			"slds-is-relative slds-var-p-right_x-large" :
			""
	}

	get showCloseEditButton() {
		return this.isFormReady &&
			this.isView &&
			this.isEditing;
	}

	handleRecordFieldChange(event) {
		event.stopPropagation();
		this.setValue(event.detail.value, true);
	}

	handleOnEditClick() {
		this.isEditing = true;
	}

	handleOnCloseEditClick() {
		this.isEditing = false;
	}

	handleOnFormLoad() {
		this.isFormReady = true;
	}

	setValue(v, doNotify) {
		this._record[this.field.fieldApiName] = v;
		if (doNotify)
			this.customEvent("change", {
				field: this.field,
				record: this._record
			});
	}
}