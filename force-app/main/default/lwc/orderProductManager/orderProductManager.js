import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { CloseActionScreenEvent } from 'lightning/actions';

import NAME_FIELD from '@salesforce/schema/Order.OrderNumber';
import ACCOUNT_ID_FIELD from '@salesforce/schema/Order.AccountId';
import ACCOUNT_NAME_FIELD from '@salesforce/schema/Order.Account.Name';

/**
 * @author Fernando Gomez
 * @since 10/30.2022
 * @versino 1.0
 */
export default class OrderProductManager extends LightningElement {
	@api
	recordId;

	details = {
		products: [],
		deletedIds: []
	};

	subtotal = 0;
	taxesPercent = 0.07;
	taxes = 0;
	discounts = 0;
	total = 0;

	isSaveDisabled = true;

	@wire(getRecord, { 
		recordId: "$recordId",
		fields: [NAME_FIELD, ACCOUNT_ID_FIELD, ACCOUNT_NAME_FIELD]
	})
	order;

	get title() {
		return `Order #${getFieldValue(this.order.data, NAME_FIELD) || ""}'s Products`;
	}

	get subtitle() {
		return `<a href="/${getFieldValue(this.order.data, ACCOUNT_ID_FIELD) || ""}">
			${getFieldValue(this.order.data, ACCOUNT_NAME_FIELD)}</a>`;
	}

	handleOnProductsChange(event) {
		this.details = {...event.detail};
		this.isSaveDisabled = false;
		this._calculateTotals();
	}

	handleCancelClick(event) {
		this.dispatchEvent(new CustomEvent('cancel'));
		this.dispatchEvent(new CloseActionScreenEvent());
	}

	handleSaveClick(event) {
		this._save();
	}

	_calculateTotals() {
		this.subtotal = this.details.products.reduce((a, c) => a + c.totalPrice, 0);
		this.taxes = this.subtotal * this.taxesPercent;
		this.total = this.subtotal + this.taxes + this.discounts;
	}

	_save() {
		
	}
}