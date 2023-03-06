import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { getRelatedListRecords } from 'lightning/uiRelatedListApi';
import { CloseActionScreenEvent } from 'lightning/actions';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import saveOrderProducts
	from '@salesforce/apex/OrderProductManagerCtrl.saveOrderProducts';
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

	@api
	details = {
		products: [],
		deletedIds: []
	};

	isReady = false;
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

	@wire(getRelatedListRecords, {
		parentRecordId: "$recordId",
		relatedListId: 'OrderItems',
		fields: [
			"OrderItem.OrderId",
			"OrderItem.Product2Id",
			"OrderItem.Quantity",
			"OrderItem.UnitPrice",
			"OrderItem.HandlingPrice__c",
			"OrderItem.Depth__c",
			"OrderItem.Width__c",
			"OrderItem.Height__c",
			"OrderItem.DeliveryType__c",
			"OrderItem.TotalPrice"
		],
		sortBy: ['OrderItem.CreatedDate']
	})
	listInfo({ error, data }) {
		if (data) {
			data.records.forEach(
				r => this.details.products.push(this._createWrapper(r)));
			this.isReady = true;
		} else if (error) {
			console.error(error);
			this.toast('Error',
				`There was a problem. ${error.body.message}`,
				'error',
				'sticky');
			this.dispatchEvent(new CustomEvent('cancel'));
		}
	}

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
		this.subtotal = this.details.products.reduce((a, c) => {
			return a + (c.totalPrice || 0);
		}, 0);
		this.taxes = this.subtotal * this.taxesPercent;
		this.total = this.subtotal + this.taxes - (this.discounts || 0);
	}

	_createWrapper(r) {
		return {
			uniqueId: r.id,
			product2Id: r.fields.Product2Id.value,
			qty: r.fields.Quantity.value,
			unitPrice: r.fields.UnitPrice.value,
			handlingPrice: r.fields.HandlingPrice__c.value,
			depth: r.fields.Depth__c.value,
			width: r.fields.Width__c.value,
			height: r.fields.Height__c.value,
			deliveryType: r.fields.DeliveryType__c.value,
			totalPrice: r.fields.TotalPrice.value,
			isDeleting: false,
			isDisabled: false,
			isValid: true,
			errorMessage: null,
			isNew: false
		};
	}

	_createFromWrapper(w) {
		return {
			Id: w.isNew ? null : w.uniqueId,
			OrderId: this.recordId,
			Product2Id: w.product2Id,
			Quantity: w.qty,
			UnitPrice: w.unitPrice,
			HandlingPrice__c: w.handlingPrice,
			Depth__c: w.depth,
			Width__c: w.width,
			Height__c: w.height,
			DeliveryType__c: w.deliveryType,
			TotalPrice: w.totalPrice
		};
	}

	_validate() {
		let isValid = true;
		this.details.products.forEach(w => {
			let issues = [];
			console.log(w);

			if (!w.product2Id)
				issues.push(
					"- Product is required");

			if (!w.qty || w.qty < 1)
				issues.push(
					"- Qty is required and it must be a positive number");
					
			if (!w.unitPrice || w.unitPrice < 0)
				issues.push(
					"- Unit Price is required and it cannot be a negative amount");

			if (issues.length > 0) {
				isValid = false;
				w.isValid = false;
				w.errorMessage = issues.join("<br/>");
			} else {
				w.isValid = true;
				w.errorMessage = null;
			}
		});

		return isValid;
	}

	_save() {
		// first, we fetch the changes from the child component
		this.details = this.template.querySelector('c-product-manager').details;

		if (!this._validate()) {
			// we have to refresh the references so they
			// get updated in the child compoenent
			// this.details = Object.assign({}, this.details);

			// and show a general toast message
			this.toast(
				"There were some issues.",
				"Please, fix the issues in the items and try again.",
				"error");
		} else {
			let records = [];
			this.details.products.forEach(w => records.push(this._createFromWrapper(w)));
			this.isSaveDisabled = true;
			this.isLoading = true;

			saveOrderProducts({
				itemsToUpsert: records,
				itemsToDelete: this.details.deletedIds
			})
			.then(result => {
				this.isLoading = false;
				this.toast('Success', 'Changes saved successfully.', 'success');
				this.dispatchEvent(new CustomEvent('cancel'));
			})
			.catch(error => {
				console.error(error);
				this.toast('Error',
					`There was a problem. ${error.body.message}`,
					'error',
					'sticky');
				this.isSaveDisabled = false;
				this.isLoading = false;
			});
		}
	}

	toast(title, msg, variant, mode) {
		this.dispatchEvent(new ShowToastEvent({
			title: title,
			message: msg,
			variant: variant,
			mode: mode
		}));
	}
}