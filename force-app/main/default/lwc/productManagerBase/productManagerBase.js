import InputBase from 'c/inputBase';
import { api, wire, track } from 'lwc';
import { createNewProduct } from "c/productCard";
import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";

import getProductWrapperById
	from "@salesforce/apex/ProductManager.getProductWrapperById";

export default class ProductManagerBase extends InputBase {
	@api
	get products() {
		return this._products;
	}

	set products(value) {
		this._products = [...value];
	}

	@api
	priceBookId = null;

	@api
	variant = "list"; // row, card

	@api
	hideAddProducts = false;

	@track
	_products = [];

	selectedProductId;

	locals = {
		numberOfProductsToAdd: 1
	};

	get hasProducts() {
		return this._products != null && this._products.length > 0;
	}

	get showAddProduct() {
		return !this.hideAddProducts && this.isEdit;
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
			case "locals":
				this.locals[field] = converted;
				break;
		}
	}

	handleOnSelectedProductChange(event) {
		this.selectedProductId = event.detail.recordId;
		this.handleAddProductClick();
	}

	/**
	 * Triggered when Add button is clickec (both)
	 * @param {*} event 
	 */
	handleAddProductClick() {
		if (this.selectedProductId) {
			this.addSelectedProduct();
			this.refreshRecordPicker();
		}
	}

	handleOnProductChange(event) {
		this.customEvent("productchange", event.detail);
	}
	
	handleOnProductDelete(event) {
		this.customEvent("productdelete", event.detail);
	}

	handleOnProductDragStart(event) {
		this.customEvent("productdragstart", event.detail);
	}

	handleOnProductDragEnd(event) {
		this.customEvent("productdragend", event.detail);
	}

	editProduct(index, product) {
		this._products[index] = product;
		this.refreshReference();
	}

	addNewProduct() {
		this.addProduct({
			...createNewProduct(),
			uniqueId: `unsaved_${this._products.length + 1}`
		});
	}

	addNewProductWithValues(values) {
		this.addProduct({
			...createNewProduct(),
			...values,
			uniqueId: `unsaved_${this._products.length + 1}`
		});
	}

	getProduct(pId, callback) {
		this.productId = pId;
		this.getProductCallback = callback;

		// the refresh apex won't happen when the last
		// product is requested again and has no changes,
		// so if we have a data saved, we process that one first
		// and let the refreshApex reprocess it if something
		// is returned and we are asking for the same product
		if (this.product2Data && this.product2Data.id == pId)
			callback(this.product2Data);

		refreshApex(this.product2Data);
	}
	
	addSelectedProduct() {
		// if product selected we need to find it in the DB
		// and copy its values
		getProductWrapperById({
			productId: this.selectedProductId,
			priceBookId: this.priceBookId
		})
		.then(result => this.addNewProductWithValues(result))
		.catch(error => {
			console.error(error);
			this.dispatchEvent(new ShowToastEvent({
				title: "Product Not Added",
				message: error.body?.message || "Unknown error.",
				variant: "error",
				mode: "sticky"
			}));
		});
	}

	addProduct(product) {
		this.customEvent("productcreate", product);
	}

	_recalculateTotal(product) {
		product.totalPrice = (product.price * product.qty) + product.handlingPrice;
	}

	refreshRecordPicker() {
		this.getComponent("lightning-record-picker").clearSelection();
	}

	refreshReference() {
		// we need to update the reference so
		// the view is also refreshed
		this.dispatchEvent(new CustomEvent('productschange', {
			detail: this._getDetails()
		}));
	}

	_getDetails() {
		return {
			products: this._products
		};
	}
}