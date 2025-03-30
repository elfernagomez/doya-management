import InputBase from 'c/inputBase';
import { api, wire, track } from 'lwc';
import { getPicklistValues } from "lightning/uiObjectInfoApi";

import PRODUCT_DISCOUNT_TYPE_FIELD from "@salesforce/schema/Product2.DiscountType__c";

export default class DiscountCard extends InputBase {
	@api
	get discount() {
		return this._discount;
	}

	set discount(value) {
		this._discount = {...value};
	}

	@track
	_discount;

	isDeleting = false;

	discountTypeOptions = [{
		label: "Fixed",
		label: "Fixed"
	}];

	get percentage() {
		return this._discount.discountAmount != null ?
			(this._discount.discountAmount * 0.01) :
			null;
	}

	get inputType() {
		if (this._discount.isFixed)
			return "currency";

		if (this._discount.isPercent)
			return "percent";

		return "number"
			 
	}

	@wire(getPicklistValues, {
		recordTypeId: "012000000000000AAA",
		fieldApiName: PRODUCT_DISCOUNT_TYPE_FIELD
	})
	wiredDiscountTypePicklistValues({ data }) {
		if (data)
			this.discountTypeOptions = data.values;
	}

	/**
	 * Triggered when inputs are changed
	 * @param {*} event 
	 */
	handleFieldChange(event) {
		let val = event.target.value;
		let field = event.target.dataset.field;
		let type = event.target.dataset.type;
		let src = event.target.dataset.src;
		let converted = this.convertToType(val, type);

		switch (src) {
			/* case "locals":
				this.locals[field] = converted;
				break; */
			case "discount":
				let discount = {};
				discount[field] = converted;

				if (field == "discountType") {
					discount.isPercentage = discount.discountType == "Percentage";
					discount.isFixed = discount.discountType == "Fixed Amount";
				}

				this.editDiscount(discount);
				break;
		}
	}

	handleOnDeleteDiscountClick() {
		// new products that have not been saved can be deleted
		// without confirmation to save time...
		if (this._discount.isNew)
			this.handleOnConfirmDeleteDiscountClick();
		// for existing products we need confirmation
		else
			this.isDeleting = true;
	}

	handleOnConfirmDeleteDiscountClick() {
		this.isDeleting = false;
		this.customEvent("productdelete", this._discount);
	}

	handleOnCancelDeleteDiscountClic(index) {
		this.isDeleting = false;
	}

	editDiscount(changes) {
		Object.assign(this._discount, changes);
		this.customEvent("productchange", this._discount);
	}
}