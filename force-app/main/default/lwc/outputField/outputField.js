import LwcBase from 'c/lwcBase';
import { api } from 'lwc';

export default class OutputField extends LwcBase {
	@api
	record;

	@api
	fieldName;

	@api
	objectApiName;

	@api
	isNameField;

	@api
	type = "record"; // record, object

	/**
	 * Applies only to object. The record version already
	 * contains a formatted value in the displayValue property
	 */
	@api
	fieldType = "text"; // text, number, currentcy

	@api
	relationshipName;

	@api
	relatedTo;

	@api
	maximumFractionDigits;

	@api
	minimumFractionDigits;

	@api
	minimumIntegerDigits;

	get fields() {
		return this.isRecord() ? [`${this.objectApiName}.${this.fieldName}`] : null;
	}

	get jsFieldType() {
		return this.fieldType.toLowerCase();
	}
	
	get isRecord() {
		return this.type == "record";
	}

	get isObject() {
		return this.type == "object";
	}

	get displayValue() {
		let value;
		switch (this.type) {
			case "record":
				if (this.isLookup && this.relatedTo) {
					const o = this.record[this.relationshipName];
					if (o && o.displayValue && o.value) {
						return `<a href="/lightning/r/${
							this.relatedTo.apiName}/${
							o.value.id}/view">${
							o.displayValue}</a>`;
					}
				}

				value = this.record[this.fieldName]?.displayValue ||
					this.record[this.fieldName]?.value;
				
				if (this.isNameField && value && this.record.Id) {
					return `<a href="/lightning/r/${
						this.objectApiName}/${
						this.record.Id?.value}/view">${
						value}</a>`;
				}

				return value || "&nbsp;";
			case "object":
			default:
				value = this.record[this.fieldName];
				return value;
		}
	}

	get isCheck() {
		return this.jsFieldType == "address";
	}

	get isAddress() {
		return this.jsFieldType == "address";
	}

	get isDateTime() {
		return this.jsFieldType == "date" ||
			this.jsFieldType == "datetime";
	}

	get isEmail() {
		return this.jsFieldType == "email";
	}

	get isLocation() {
		return this.jsFieldType == "location";
	}

	get isName() {
		return this.jsFieldType == "name";
	}

	get isDecimal() {
		return this.jsFieldType == "decimal" ||
			this.jsFieldType == "double" ||
			this.jsFieldType == "integer" ||
			this.jsFieldType == "long";
	}

	get isCurrency() {
		return this.jsFieldType == "currency";
	}

	get isPercent() {
		return this.jsFieldType == "percent";
	}

	get isPhone() {
		return this.jsFieldType == "phone";
	}

	get isRichText() {
		return this.jsFieldType == "richtext" ||
			this.jsFieldType == "textarearich";
	}

	get isText() {
		return this.jsFieldType == "text" ||
			this.jsFieldType == "string" ||
			this.jsFieldType == "picklist";
	}

	get isTime() {
		return this.jsFieldType == "time";
	}

	get isUrl() {
		return this.jsFieldType == "url";
	}

	get isLookup() {
		return this.jsFieldType == "reference";
	}
}