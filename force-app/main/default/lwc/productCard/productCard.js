import InputBase from 'c/inputBase';
import { api, wire, track } from 'lwc';
import { getFieldValue } from "lightning/uiRecordApi";
import { getPicklistValues } from "lightning/uiObjectInfoApi";
import rowMode from "./row.html";
import listItemMode from "./listItem.html";
import tileMode from "./tile.html";
import styles from "./productCard.css";

import PRODUCT_NAME_FIELD from "@salesforce/schema/Product2.Name";
import PRODUCT_CODE_FIELD from "@salesforce/schema/Product2.ProductCode";
import PRODUCT_DEPTH_FIELD from "@salesforce/schema/Product2.Depth__c";
import PRODUCT_WIDTH_FIELD from "@salesforce/schema/Product2.Width__c";
import PRODUCT_HEIGHT_FIELD from "@salesforce/schema/Product2.Height__c";
import PRODUCT_FINISH_FIELD from "@salesforce/schema/Product2.Finish__c";
import PRODUCT_DISCOUNT_TYPE_FIELD
	from "@salesforce/schema/Product2.DiscountType__c";
import PRODUCT_DISCOUNT_AMOUNT_FIELD
	from "@salesforce/schema/Product2.DiscountAmount__c";
import PRODUCT_MATERIAL_ID_FIELD
	from "@salesforce/schema/Product2.Material__c";
import PRODUCT_MATERIAL_NAME_FIELD
	from "@salesforce/schema/Product2.Material__r.Name";
import RECORD_TYPE_ID_FIELD from "@salesforce/schema/Product2.RecordTypeId";
import RECORD_TYPE_NAME_FIELD from "@salesforce/schema/Product2.RecordType.DeveloperName";
import UNIT_TYPE_FIELD from "@salesforce/schema/Product2.QuantityUnitOfMeasure";

export function createNewProduct() {
	return {
		uniqueId: "unsaved_0",
		productId: null,
		productName: null,
		productCode: null,
		productTypeId: null,
		productTypeName: null,
		groupId: null,
		materialId: null,
		materialName: null,
		qty: 1,
		unitType: "Each",
		width: null,
		height: null,
		depth: null,
		finish: null,
		notes: null,
		discountType: null,
		discountAmount: null,
		unitPrice: 0.01,
		listPrice: 0.01,
		totalPrice: 0.01,
		isBusy: false,
		isDisabled: false,
		hasError: false,
		errorMessage: null,
		isNew: true,
		isHidden: false,
		isVisible: true,
		isProduct: true,
		isDiscount: false,
		isPercentage: false,
		isFixed: false,
		isPart: false,
		hasParts: false
	};
}

export function getProductFromProductRecord(record) {
	return {
		productId: record.id,
		productName: getFieldValue(record, PRODUCT_NAME_FIELD),
		productCode: getFieldValue(record, PRODUCT_CODE_FIELD),
		unitType: getFieldValue(record, UNIT_TYPE_FIELD),
		depth: getFieldValue(record, PRODUCT_DEPTH_FIELD),
		width: getFieldValue(record, PRODUCT_WIDTH_FIELD),
		height: getFieldValue(record, PRODUCT_HEIGHT_FIELD),
		finish: getFieldValue(record, PRODUCT_FINISH_FIELD),
		discountType: getFieldValue(record, PRODUCT_DISCOUNT_TYPE_FIELD),
		discountAmount: getFieldValue(record, PRODUCT_DISCOUNT_AMOUNT_FIELD),
		productTypeId: getFieldValue(record, RECORD_TYPE_ID_FIELD),
		productTypeName: getFieldValue(record, RECORD_TYPE_NAME_FIELD),
		materialId: getFieldValue(record, PRODUCT_MATERIAL_ID_FIELD),
		materialName: getFieldValue(record, PRODUCT_MATERIAL_NAME_FIELD),
		isProduct: getFieldValue(record, RECORD_TYPE_NAME_FIELD) == "Product",
		isDiscount: getFieldValue(record, RECORD_TYPE_NAME_FIELD) == "Discount",
		isPercentage: getFieldValue(record, PRODUCT_DISCOUNT_TYPE_FIELD) == "Percentage",
		isFixed: getFieldValue(record, PRODUCT_DISCOUNT_TYPE_FIELD) == "Fixed Amount"
	};
}

export function addErrorToProduct(product, errorMessage, erroObject) {
	product.hasError = true;
	product.errorMessage = errorMessage;
	product.errorObject = erroObject;
	return product;
}

export function removeErrorFromProduct(product) {
	product.hasError = false;
	product.errorMessage = null;
	product.errorObject = null;
	return product;
}

export default class ProductCard extends InputBase {
	static stylesheets = [styles];

	@api
	get product() {
		return this._product;
	}

	set product(value) {
		this._product = {...value};
		this.showNotes = this._product.notes ? true : false;
	}

	@api
	variant = "row"; // row, list-item, tile

	@api
	hideQty = false;

	@api
	hideUnitType = false;

	@api
	hideUnitPrice = false;

	@api
	hideDimensions = false;

	@api
	hideTotals = false;

	@api
	hidePartsToggle = false;

	@track
	_product;

	showNotes = false;
	isDeleting = false;
	isDraggingActive = false;

	unitTypeOptions = [{
		label: "Each",
		value: "Each"
	}];

	get showQty() {
		return !this.hideQty;
	}

	get showUnitType() {
		return !this.hideUnitType;
	}

	get showUnitPrice() {
		return !this.hideUnitPrice;
	}

	get showDimensions() {
		return !this.hideDimensions && this._product.unitType != "Hour";
	}

	get showTotals() {
		return !this.hideTotals;
	}

	get showPartsToggle() {
		return !this.hidePartsToggle && this._product.hasParts;
	}

	get mainViewClass() {
		return [
			"slds-box",
			"slds-box_xx-small",
			"slds-theme_default",
			this._product.isHidden ? "slds-hide" : ""
		].join(" ");
	}

	get mainEditClass() {
		return [
			"slds-box",
			"slds-box_xx-small",
			"slds-is-relative",
			"slds-media",
			"slds-media_small",
			"slds-theme_default",
			"draggable",
			this._product.isHidden ? "slds-hide" : ""
		].join(" ");
	}

	get productColumnSize() {
		return this.showTotals ? "3" : "6";
	}

	get isDimensionsDisabled() {
		return this._product.isDisabled ||
			this._product.unitType == "Each";
	}

	get isDraggingAllowed() {
		return this.isEdit;
	}

	@wire(getPicklistValues, {
		recordTypeId: "012000000000000AAA",
		fieldApiName: UNIT_TYPE_FIELD
	})
	wiredUnitTypePicklistValues({ data }) {
		if (data)
			this.unitTypeOptions = data.values;
	}

	render() {
		switch (this.variant) {
			case "row":
				return rowMode;
			case "list-item":
				return listItemMode;
			case "tile":
			default:
				return tileMode;
		}
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
		let product = {};

		switch (src) {
			/* case "locals":
				this.locals[field] = converted;
				break; */
			case "product":
				product[field] = converted;
				this.editProduct(product);
				break;
			default:
				break;
		}
	}

	/**
	 * Triggered when inputs are changed
	 * @param {*} event 
	 */
	handleOnNotesChange(event) {
		let notes = event.detail.value;
		let product = { notes };
		this.editProduct(product);
	}

	handleOnDeleteProductClick() {
		// new products that have not been saved can be deleted
		// without confirmation to save time...
		if (this._product.isNew)
			this.handleOnConfirmDeleteProductClick();
		// for existing products we need confirmation
		else
			this.isDeleting = true;
	}

	handleOnConfirmDeleteProductClick() {
		this.isDeleting = false;
		this.customEvent("productdelete", this._product);
	}

	handleOnCancelDeleteProductClic() {
		this.isDeleting = false;
	}

	handleOnHandlerMouseDown() {
		const draggable = this.getComponent(".draggable");
		draggable.setAttribute("draggable", true);

		const handleDragStart = (e) => {
			this.customEvent("productdragstart", this._product);
			e.dataTransfer.setData("text/json", JSON.stringify(this._product));
		};

		const handleDragEnd = () => {
			draggable.removeAttribute("draggable");
			draggable.removeEventListener("dragstart", handleDragStart);
			draggable.removeEventListener("dragend", handleDragEnd);
			this.customEvent("productdragend", this._product);
		};

		draggable.addEventListener("dragstart", handleDragStart);
		draggable.addEventListener("dragend", handleDragEnd);

		/* const draggable = this.getComponent(".draggable");
		const top = draggable.style.top;
		const zIndex = draggable.style.zIndex;
		const rect = draggable.getBoundingClientRect();
		const offsetY = event.clientY - rect.top;

		function handleMouseMove(e) {
			draggable.style.top = (e.clientY - offsetY - rect.top) + 'px';
			draggable.style.zIndex = 999;
		}

		function handleMouseUp(e) {
			document.removeEventListener("mousemove", handleMouseMove);
			draggable.style.top = top;
			draggable.style.zIndex = zIndex;
		}
	
		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp); */
	}

	/* handleOnHandlerMouseUp(event) {
		const draggable = this.getComponent(".draggable");
		draggable.removeAttribute("draggable");
	} */

	handleOnMenuSelect(event) {
		switch (event.detail.value) {
			case "createWorkOrder":
				this.handleOnCreateWorkOrder();
				break;
			default:
				break;
		}
	}

	handleOnCreateWorkOrder() {
		this.customEvent(
			"createworkorder",
			this._product,
			{
				composed: true,
				bubbles: true
			});
	}

	handleOnShowPartsToggleClick() {
		this.customEvent(
			"showpartstoggle",
			this._product,
			{
				composed: true,
				bubbles: true
			}
		);
	}

	handleOnGroupClick() {
		// 
	}

	handleOnAddNotesClick() {
		this.showNotes = true;
	}

	editProduct(changes) {
		Object.assign(this._product, changes);
		this.customEvent("productchange", this._product);
	}

	validate() {
		let isValid = true;
		let issues = [];

		if (!this._product.productId)
			issues.push(
				"- Product is required");

		if (!this._product.qty || this._product.qty < 1)
			issues.push(
				"- Qty is required and it must be a positive number");
				
		if (!this._product.unitPrice || this._product.unitPrice < 0)
			issues.push(
				"- Unit Price is required and it cannot be a negative amount");

		if (issues.length > 0) {
			isValid = false;
			this.addError(issues.join("<br/>"));
		} else {
			isValid = true;
			this.removeError();
		}

		return isValid;
	}
}