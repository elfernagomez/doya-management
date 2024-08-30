import { api, wire, LightningElement } from 'lwc';
import {
	getRecord,
	getFieldValue
} from 'lightning/uiRecordApi';

import STAFF_OBJECT
	from '@salesforce/schema/Staff__c';

import FIRST_NAME_FIELD from
	"@salesforce/schema/Staff__c.FirstName__c";
import LAST_NAME_FIELD from
	"@salesforce/schema/Staff__c.LastName__c";

export default class StaffOutputField extends LightningElement {
	@api
	recordId;

	@api
	variant = "field";

	get fullName() {
		return [
			getFieldValue(this.staff.data, FIRST_NAME_FIELD),
			getFieldValue(this.staff.data, LAST_NAME_FIELD)
		].join(" ");
	}

	@wire(getRecord, {
		recordId: "$recordId",
		fields: [
			FIRST_NAME_FIELD,
			LAST_NAME_FIELD
		]
	})
	staff;
}