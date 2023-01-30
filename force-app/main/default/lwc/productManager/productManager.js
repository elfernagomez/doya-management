import { LightningElement, api, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { refreshApex } from '@salesforce/apex';

/**
 * @author Fernando Gomez
 * @since 10/30.2022
 * @versino 1.0
 */
export default class ProductManager extends LightningElement {
	@api
	get details() {
		return _getDetails();
	}

	set details(_details) {
		this.products = [..._details?.products || []]
		this.deletedIds = [..._details?.deletedIds || []]
	}

	products = [];
	deletedIds = [];

	product2Id;
	product2WiredActivities;
	product2Data;
	getProductCallback;

	locals = {
		numberOfProductsToAdd: 1
	};

	newProductRequestIndex;
	isNewProductPanelOpen = false;

	@wire(getRecord, { 
		recordId: "$product2Id",
		layoutTypes: ["Full"],
		modes: ["View"]
	})
	getProduct2(value) {
		this.product2WiredActivities = value;
		const { data, error } = value;
		this.product2Data = data;
		
		if (this.product2Data && this.getProductCallback) 
			this.getProductCallback(data);
	};

	get hasProducts() {
		return this.products != null && this.products.length > 0;
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
		let converted = this._convertToType(val, type);

		switch (src) {
			case "locals":
				this.locals[field] = converted;
				break;
			case "product":
				let index = event.target.dataset.index;
				let product = {};
				product[field] = converted;
				this.editProduct(index, product);
				break;
		}
	}

	/**
	 * Triggered when Add button is clickec (both)
	 * @param {*} event 
	 */
	handleAddProductsClick(event) {
		let times = this.locals.numberOfProductsToAdd;
		this.locals.numberOfProductsToAdd = 1;
		// we add as many produts as requested..
		// and leave the value in 1
		while (times-- > 0)
			this.addNewProduct();
	}

	/**
	 * Triigered when the New Product link is clicked
	 * @param {*} event 
	 */
	handleNewProductClick(event) {
		this.newProductRequestIndex =
			this._convertToType(event.target.dataset.index, "int");
		event.preventDefault();
		this.openNewProductPanel();
	}

	/**
	 * Triigered when the Delete link is clicked
	 * @param {*} event 
	 */
	handleDeleteProductClicked(event) {
		let index = this._convertToType(event.target.dataset.index, "int");
		event.preventDefault();
		this.deleteProduct(index);
	}

	/**
	 * Triigered when any of the Confirm Delete links is clicked
	 * @param {*} event 
	 */
	handleConfirmDeleteProductClicked(event) {
		let index = this._convertToType(event.target.dataset.index, "int");
		let value = this._convertToType(event.target.dataset.value, "bool");
		event.preventDefault();

		// we delete if confirmed, cancel if canceled
		if (value)
			this.confirmDeleteProduct(index);
		else
			this.cancelDeleteProduct(index);
	}

	/**
	 * Triggered when a product is selected from the lookup
	 * @param {*} event 
	 */
	handleProductSelection(event) {
		let selectedProduct2Id = event.target.value;
		let index = parseInt(event.target.dataset.index);
		this.selectProduct(selectedProduct2Id, index);
	}

	/**
	 * 
	 * @param {*} event 
	 */
	handleCreateProductSuccess(event) {
		let newProduct2Id = event.detail.id;
		this.selectProduct(newProduct2Id, this.newProductRequestIndex);
		this.closeNewProductModal();
	}

	/**
	 * When the Close button of the panel is clicked
	 * @param {*} event 
	 */
	handleNewProductPanelClose(event) {
		this.closeNewProductModal();
	}

	selectProduct(selectedProduct2Id, index) {
		if (selectedProduct2Id)
			// if product selected we need to find it in the DB
			// and copy its values
			this.getProduct(selectedProduct2Id, (product2Data) => {
				this.editProduct(index, this.translateProduct(product2Data));
			});
		else
			// if product was cleared, we need to clear the value in the item
			this.editProduct(index, { selectedProduct2Id: null });
	}

	translateProduct(data) {
		return {
			product2Id: data.id,
			description: data.fields.Description.value,
			productCode: data.fields.ProductCode.value,
			productSku: data.fields.StockKeepingUnit.value,
			name: data.fields.Name.value,
			category: data.fields.Category__c.value,
			depth: data.fields.Depth__c.value,
			width: data.fields.Width__c.value,
			height: data.fields.Height__c.value,
			finish: data.fields.Finish__c.value,
			isActive: data.fields.IsActive.value
		};
	}

	getProduct(pId, callback) {
		this.product2Id = pId;
		this.getProductCallback = callback;

		// the refresh apex won't happen when the last
		// product is requested again and has no changes,
		// so if we have a data saved, we process that one first
		// and let the refreshApex reprocess it if something
		// is returned and we are asking for the same product
		if (this.product2Data && this.product2Data.id == pId)
			callback(this.product2Data);

		refreshApex(this.product2);
	}

	editProduct(index, product) {
		let existent = this.products[index];
		this.products[index] = { ...existent, ...product };
		this._recalculateTotal(this.products[index]);
		this._refreshReference();
	}

	addNewProduct() {
		this.addProduct({
			uniqueId: `unsaved_${this.products.length + 1}`,
			product2Id: null,
			qty: 1,
			unitPrice: 0,
			handlingPrice: 0,
			depth: null,
			width: null,
			height: null,
			deliveryType: null,
			isBusy: false,
			isDeleting: false,
			isDisabled: false,
			totalPrice: 0
		});
	}

	addProduct(product) {
		this.products.push(product);
		this._refreshReference();
	}

	deleteProduct(index) {
		let product = this.products[index];

		// new products that have not been saved can be deleted
		// without confirmation to save time...
		if (this._isNew(product))
			this.products.splice(index, 1);
		// for existing products we need confirmation
		else {
			product.isDeleting = true;
			product.isDisabled = true;
		}

		this._refreshReference();
	}

	confirmDeleteProduct(index) {
		let product = this.products[index];
		this.deletedIds.push(product.uniqueId);
		this.products.splice(index, 1);
		this._refreshReference();
	}

	cancelDeleteProduct(index) {
		let product = this.products[index];
		product.isDeleting = false;
		product.isDisabled = false;
		this._refreshReference();
	}

	/**
	 * Open the modal that crates a new product
	 */
	openNewProductPanel() {
		this.isNewProductPanelOpen = true;
	}

	/**
	 * Close the modal that crates a new product
	 */
	closeNewProductModal() {
		this.isNewProductPanelOpen = false;
	}

	_recalculateTotal(product) {
		product.totalPrice = (product.unitPrice * product.qty) + product.handlingPrice;
	}

	_refreshReference() {
		// we need to update the reference so
		// the view is also refreshed
		this.products = [...this.products];
		this.dispatchEvent(new CustomEvent('productschange', {
			detail: this._getDetails()
		}));
	}

	_convertToType(val, type) {
		switch (type) {
			case "int":
				return parseInt(val);
			case "float":
				return parseFloat(val);
			case "bool":
				return val?.toLowerCase() == "true";
			default:
				return val;
		}
	}

	/**
	 * @param {*} product 
	 * @returns true if the product has never been saved into the database.
	 * Meaning it was just created interacting with this tool.
	 */
	_isNew(product) {
		return product.uniqueId.startsWith("unsaved_");
	}

	_getDetails() {
		return {
			products: this.products,
			deletedIds: this.deletedIds
		};
	}
}