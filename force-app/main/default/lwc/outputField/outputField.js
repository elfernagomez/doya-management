import { LightningElement, api, wire } from 'lwc';
import { getObjectInfo } from "lightning/uiObjectInfoApi";

export default class OutputField extends LightningElement {
	@api
	record;

	@api
	fieldName = "Name";

	@api
	objectApiName;

	@api
	type = "record"; // record, object

	/**
	 * Applies only to object. The record version already
	 * contains a formatted value in the displayValue property
	 */
	@api
	fieldType = "text"; // text, number, currentcy

	@api
	maximumFractionDigits;

	@api
	minimumFractionDigits;

	@api
	minimumIntegerDigits;
	
	get isRecord() {
		return this.type == "record";
	}

	get isObject() {
		return this.type == "object";
	}

	get displayValue() {
		switch (this.type) {
			case "record":
				return this.record[this.fieldName]?.displayValue ||
					this.record[this.fieldName]?.value ||
					"&nbsp;";
			case "object":
			default:
				return this.record[this.fieldName];
		}
	}

	get isAddress() {
		return this.fieldType == "address";
	}

	get isDateTime() {
		return this.fieldType == "datetime";
	}

	get isEmail() {
		return this.fieldType == "email";
	}

	get isLocation() {
		return this.fieldType == "location";
	}

	get isName() {
		return this.fieldType == "name";
	}

	get isDecimal() {
		return this.fieldType == "decimal";
	}

	get isCurrency() {
		return this.fieldType == "currency";
	}

	get isPercent() {
		return this.fieldType == "percent";
	}

	get isPhone() {
		return this.fieldType == "phone";
	}

	get isRichText() {
		return this.fieldType == "richtext";
	}

	get isText() {
		return this.fieldType == "text";
	}

	get isTime() {
		return this.fieldType == "time";
	}

	get isUrl() {
		return this.fieldType == "url";
	}

	@wire(getObjectInfo, {
		objectApiName: "$objectApiName"
	})
	wiredObjectInfo({ error, data}) {
		if (data) {
			this.logAsStringPretty(data);
		}
	}
}