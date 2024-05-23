import LwcBase from "c/lwcBase";
import { api, track } from "lwc";
import { lineItemManagerLabels } from "c/constants";

export default class LineItemManagerStep extends LwcBase {
	@api
	get item() {
		return this._item;
	}

	set item(value) {
		this._item = {...value};
	}

	@api
	variant = "view";

	@api
	mode = "prod"; // admin, prod

	@api
	objectApiName = "WorkOrderLineItem";

	@api
	procedureOptions = {};

	@track
	_item;

	labels = lineItemManagerLabels;

	get isView() {
		return this.variant == "view";
	}

	get isEdit() {
		return this.variant == "edit";
	}

	get isAdmin() {
		return this.mode == "admin";
	}

	get isProd() {
		return this.mode == "prod";
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

	handleDetailsRecordFieldChange(event) {
		this._item.detailsValue = event.detail.recordId;
		this.handleRecordFieldChange(event);
	}

	handleRecordFieldChange(event) {
		console.log(
			event.target.dataset.fieldName,
			JSON.stringify(event.detail)
		);
		// this._item.record[field] = event.detail.recordId;
	}

	handleShowNotesClick() {
		this.editItem({
			showNotes: true
		});
	}

	handleHideNotesClick() {
		this.editItem({
			showNotes: false
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
		this.editItem(changes);

		if (field == "procedureId")
			this.applyProcedure(index);
	}

	editItem(changes) {
		try {
		Object.keys(changes)
			.forEach(k => this._item[k] = changes[k]);
		// launch event
		console.log(JSON.stringify(this._item));
		} catch (error) {
			console.error(error);
		}
	}

	applyProcedure(index) {
		this.cleanProcedureDependencies(index);
		this._item.record.Procedure__c = this._item.procedureId;

		if (this._item.procedureId) {
			let proc = this.procedureOptions.find(p => p.value == this._item.procedureId);
			this._item.showDetails = proc.detailsType != PROCEDURE_DETAIL_NOT_NEEDED;
			this._item.detailsField = proc.detailsFieldApiName;
			this._item.isDetailsMachine = this._item.detailsField == 'Machine__c';
			this._item.detailsFilter = {
				criteria: [{
					fieldPath: "Skills__c",
					operator: "includes",
					value: proc.label
				}]
			};
		}
	}
}