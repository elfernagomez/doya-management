import LwcBase from 'c/lwcBase';
import { api, wire, track } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';

import getRecordDisplayData
	from "@salesforce/apex/RecordDisplayService.getRecordDisplayData";

export default class FieldValuePill extends LwcBase {
	@api
	get value() {
		return this._value;
	}

	set value(value) {
		this._value = value;
		this.handleNewValue();
	}

	@api
	variant = "pill" // pill, tile

	@api
	label;

	@api
	fieldApiName;

	_value;
	recordId;
	data;

	@track
	objectData;

	get isPill() {
		return this.variant == "pill";
	}

	get isTile() {
		return this.variant == "tile";
	}

	get isId() {
		return typeof this._value == 'string' &&
			this._value.match(/^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/g) != null
	}

	get displayValue() {
		return this.data ?
			this.data.displayValue :
			this._value;
	}

	get objectApiName() {
		return this.data?.objectApiName;
	}

	get iconName() {
		return null;
	}

	get iconUrl() {
		return this.objectData?.themeInfo.iconUrl;
	}

	get showIcon() {
		return this.iconUrl != null;
	}

	get iconStyle() {
		return this.objectData ?
			`background-color:#${this.objectData.themeInfo.color};` :
			null;
	}

	@wire(getRecordDisplayData, {
		recordId: "$recordId"
	})
	wiredGetRecordDisplayData(result) {
		const { error, data } = result;
		if (data) {
			this.data = data;
		} else if (error) {
			this.addError(
				"Issue fetching record",
				error.body.message);
		}
	}

	@wire(getObjectInfo, {
		objectApiName: "$objectApiName"
	})
	handleObjectInfo({ data, error }) {
		if (data) {
			this.objectData = data;
		} else if (error) {
			this.addError(
				"Issue fetching record",
				error.body.message);
		}
	}

	handleNewValue() {
		if (this.isId) {
			this.recordId = this._value;
		} else {
			this.recordId = null;
		}
	}

	handleOnRemoveClick() {
		this.customEvent("remove", {
			detail: this._value
		});
	}
}