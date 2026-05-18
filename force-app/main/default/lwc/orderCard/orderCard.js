import InputBase from 'c/inputBase';
import { api, wire } from 'lwc';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import { NavigationMixin } from 'lightning/navigation';

import ORDER_NUMBER_FIELD
	from "@salesforce/schema/Order.OrderNumber";
import STATUS_FIELD
	from "@salesforce/schema/Order.Status";
import ACCOUNT_ID_FIELD
	from "@salesforce/schema/Order.AccountId";
import ACCOUNT_NAME_FIELD
	from "@salesforce/schema/Order.Account.Name";
import DUE_DATE_FIELD
	from "@salesforce/schema/Order.DueDate__c";
import TOTAL_AMOUNT_FIELD
	from "@salesforce/schema/Order.TotalAmount";

export function createOrderFromRecord(record) {
	return {
		uniqueId: record.id,
		orderNumber: getFieldValue(record, ORDER_NUMBER_FIELD),
		status: getFieldValue(record, STATUS_FIELD),
		accountId: getFieldValue(record, ACCOUNT_ID_FIELD),
		accountName: getFieldValue(record, ACCOUNT_NAME_FIELD),
		dueDate: getFieldValue(record, DUE_DATE_FIELD),
		totalAmount: getFieldValue(record, TOTAL_AMOUNT_FIELD)
	};
}

export function createOrderFromApexRecord(record) {
	return {
		uniqueId: record.Id,
		orderNumber: record.OrderNumber,
		status: record.Status,
		accountId: record.AccountId,
		accountName: record.Account?.Name,
		dueDate: record.DueDate__c,
		totalAmount: record.TotalAmount
	};
}

export default class OrderCard extends NavigationMixin(InputBase) {
	@api
	recordId;

	@api
	productCount;

	@api
	get orderData() {
		return this.order;
	}

	set orderData(value) {
		this.order = {...value};
	}

	order = {};

	@wire(getRecord, { 
		recordId: "$recordId",
		fields: [
			ORDER_NUMBER_FIELD,
			STATUS_FIELD,
			ACCOUNT_ID_FIELD,
			ACCOUNT_NAME_FIELD,
			DUE_DATE_FIELD,
			TOTAL_AMOUNT_FIELD
		]
	})
	wiredOrder({ data, error }) {
		if (data) {
			this.order = createOrderFromRecord(data);
		} else if (error) {
			this.addError(
				`There was an issue while retrieving the order (${this.recordId})`,
				error);
		}
	}

	handleNavigateToOrder(event) {
		event.preventDefault();
		this[NavigationMixin.Navigate]({
			type: 'standard__recordPage',
			attributes: {
				recordId: this.recordId,
				objectApiName: 'Order',
				actionName: 'view'
			}
		});
	}
}
