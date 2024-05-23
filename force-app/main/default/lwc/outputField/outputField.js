import { LightningElement, api, wire } from 'lwc';
import { getObjectInfo } from "lightning/uiObjectInfoApi";

export default class OutputField extends LightningElement {
	@api
	record;

	@api
	fieldName = "Name";

	@api
	objectApiName;

	get displayValue() {
		return this.record[this.fieldName]?.displayValue ||
			this.record[this.fieldName]?.value ||
			"&nbsp;";
	}

	get jsonValue() {
		return JSON.stringify(this.record);
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