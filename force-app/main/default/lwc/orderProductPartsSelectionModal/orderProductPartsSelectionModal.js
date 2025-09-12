import { api, track, wire } from 'lwc';
import LightningModal from 'lightning/modal';
// import { getRecord } from "lightning/uiRecordApi";
import { getProductFromProductRecord } from "c/productCard";
import { orderProductPartsSelectionModalLabels } from "c/constants";
import { getRelatedListRecords } from "lightning/uiRelatedListApi";

import PART_OBJECT
	from "@salesforce/schema/ProductPart__c";

import PART_PRODUCT_ID_FIELD
	from "@salesforce/schema/ProductPart__c.PartProduct__r.Id";
import PART_PRODUCT_NAME_FIELD
	from "@salesforce/schema/ProductPart__c.PartProduct__r.Name";
import PART_PRODUCT_PRODUCT_CODE_FIELD
	from "@salesforce/schema/ProductPart__c.PartProduct__r.ProductCode";
import PART_PRODUCT_DEPTH_FIELD
	from "@salesforce/schema/ProductPart__c.PartProduct__r.Depth__c";
import PART_PRODUCT_WIDTH_FIELD
	from "@salesforce/schema/ProductPart__c.PartProduct__r.Width__c";
import PART_PRODUCT_HEIGHT_FIELD
	from "@salesforce/schema/ProductPart__c.PartProduct__r.Height__c";
import PART_PRODUCT_FINISH_FIELD
	from "@salesforce/schema/ProductPart__c.PartProduct__r.Finish__c";
import PART_PRODUCT_DISCOUNT_TYPE_FIELD
	from "@salesforce/schema/ProductPart__c.PartProduct__r.DiscountType__c";
import PART_PRODUCT_DISCOUNT_AMOUNT_FIELD
	from "@salesforce/schema/ProductPart__c.PartProduct__r.DiscountAmount__c";
import PART_PRODUCT_MATERIAL_ID_FIELD
	from "@salesforce/schema/ProductPart__c.PartProduct__r.Material__c";
import PART_PRODUCT_MATERIAL_NAME_FIELD
	from "@salesforce/schema/ProductPart__c.PartProduct__r.Material__r.Name";
import PART_PRODUCT_RECORD_TYPE_ID_FIELD
	from "@salesforce/schema/ProductPart__c.PartProduct__r.RecordTypeId";
import PART_PRODUCT_RECORD_TYPE_NAME_FIELD
	from "@salesforce/schema/ProductPart__c.PartProduct__r.RecordType.DeveloperName";
import PART_PRODUCT_QTY_OF_MESSRE_FIELD
	from "@salesforce/schema/ProductPart__c.PartProduct__r.QuantityUnitOfMeasure";

export default class OrderProductPartsSelectionModal extends LightningModal {
	@api
	productId;

	@api
	product;

	@track
	parts = [];

	size = "small";
	fieldApiNames = [];
	isProductSelected = true
	isSelectAllParts = false;

	get labels() {
		return orderProductPartsSelectionModalLabels;
	}

	get selectedParts() {
		return this.parts.filter(p => p.isSelected);
	}

	get isAddPartsButtonDisabled() {
		return !this.isProductSelected &&
			this.parts.find(p => p.isSelected) == null;
	}

	get submitButtonCaption() {
		const isPartsSelected = this.parts.find(p => p.isSelected) != null;
		
		if (this.isProductSelected && isPartsSelected) {
			return "Add Product & Parts";
		} else if (this.isProductSelected && !isPartsSelected) {
			return "Add Product (No Parts)";
		} else if (!this.isProductSelected && isPartsSelected) {
			return "Add Parts Only";
		}
		
		return "Select Products or Parts";
	}

	connectedCallback() {
		this.fieldApiNames = [
			`${PART_OBJECT.objectApiName}.${
				PART_PRODUCT_ID_FIELD.fieldApiName}`,
			`${PART_OBJECT.objectApiName}.${
				PART_PRODUCT_NAME_FIELD.fieldApiName}`,
			`${PART_OBJECT.objectApiName}.${
				PART_PRODUCT_PRODUCT_CODE_FIELD.fieldApiName}`,
			`${PART_OBJECT.objectApiName}.${
				PART_PRODUCT_DEPTH_FIELD.fieldApiName}`,
			`${PART_OBJECT.objectApiName}.${
				PART_PRODUCT_WIDTH_FIELD.fieldApiName}`,
			`${PART_OBJECT.objectApiName}.${
				PART_PRODUCT_HEIGHT_FIELD.fieldApiName}`,
			`${PART_OBJECT.objectApiName}.${
				PART_PRODUCT_FINISH_FIELD.fieldApiName}`,
			`${PART_OBJECT.objectApiName}.${
				PART_PRODUCT_DISCOUNT_TYPE_FIELD.fieldApiName}`,
			`${PART_OBJECT.objectApiName}.${
				PART_PRODUCT_DISCOUNT_AMOUNT_FIELD.fieldApiName}`,
			`${PART_OBJECT.objectApiName}.${
				PART_PRODUCT_MATERIAL_ID_FIELD.fieldApiName}`,
			`${PART_OBJECT.objectApiName}.${
				PART_PRODUCT_MATERIAL_NAME_FIELD.fieldApiName}`,
			`${PART_OBJECT.objectApiName}.${
				PART_PRODUCT_RECORD_TYPE_ID_FIELD.fieldApiName}`,
			`${PART_OBJECT.objectApiName}.${
				PART_PRODUCT_RECORD_TYPE_NAME_FIELD.fieldApiName}`,
			`${PART_OBJECT.objectApiName}.${
				PART_PRODUCT_QTY_OF_MESSRE_FIELD.fieldApiName}`
		];
	}

	@wire(getRelatedListRecords, {
		parentRecordId: "$productId",
		relatedListId: "ProductParts__r",
		fields: "$fieldApiNames"
	})
	wiredProductParts({ error, data }) {
		if (data) {
			this.parts =
				data.records
					.filter(r =>
						r.fields?.PartProduct__r?.value != null)
					.map(r => ({
						...getProductFromProductRecord(
							r.fields.PartProduct__r.value),
						isSelected: true
					}));
			this.isSelectAllParts = this.parts.every(p => p.isSelected);
		} else if (error) {
			console.error(
				"Error retrieving related line items",
				error);
		}
	}

	handleOnCancelClick() {
		this.close({
			action: "cancel"
		});
	}

	handleOnSelectProductCheckboxChange(event) {
		const isChecked = event.target.checked;
		this.isProductSelected = isChecked;
	}

	handleOnSelectAllPartCheckboxChange(event) {
		const isAllChecked = event.target.checked;
		this.isSelectAllParts = isAllChecked;
		this.parts.forEach(p => (p.isSelected = isAllChecked));
	}

	handleOnSelectPartCheckboxChange(event) {
		const partId = event.target.dataset.partId;
		const isChecked = event.target.checked;
		const part = this.parts.find(p => p.productId == partId);
		if (part) {
			part.isSelected = isChecked;
			this.isSelectAllParts = this.parts.every(p => p.isSelected);
		}
	}

	handleOnAddPartsClick() {
		this.close({
			action: "add",
			addProduct: this.isProductSelected,
			product: this.product,
			addParts: this.selectedParts.length > 0,
			parts: this.selectedParts
		});
	}
}