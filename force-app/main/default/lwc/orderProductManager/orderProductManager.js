import InputBase from 'c/inputBase';
import { api, track, wire } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import { notifyRecordUpdateAvailable } from 'lightning/uiRecordApi';
import {
	getRecord,
	getFieldValue,
	createRecord,
	deleteRecord
} from "lightning/uiRecordApi";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { 
	createNewProduct,
	addErrorToProduct,
	removeErrorFromProduct
} from "c/productCard";
import {
	createNewDelvieryGroup,
	createGroupRecord,
	createGroupFromApexRecord,
	DEFAULT_GROUP_NAME
} from "c/deliveryGroupCard";
import LightningConfirm from 'lightning/confirm';

import getDeliveryGroups
	from "@salesforce/apex/OrderProductManagerCtrl.getDeliveryGroups";
import getOrderProductsByProductType
	from "@salesforce/apex/OrderProductManagerCtrl.getOrderProductsByProductType";
import saveOrderProducts
	from "@salesforce/apex/OrderProductManagerCtrl.saveOrderProducts";

import NAME_FIELD from "@salesforce/schema/Order.OrderNumber";
import DUE_DATE_FIELD from "@salesforce/schema/Order.DueDate__c";
import STATUS_FIELD from "@salesforce/schema/Order.Status";
import ACCOUNT_ID_FIELD from "@salesforce/schema/Order.AccountId";
import ACCOUNT_NAME_FIELD from "@salesforce/schema/Order.Account.Name";

import GROUP_OBJECT
	from "@salesforce/schema/DeliveryGroup__c";
import WORK_ORDER_OBJECT
	from "@salesforce/schema/WorkOrder";

import ITEM_OBJECT
	from "@salesforce/schema/OrderItem";

import ITEM_ID_FIELD
	from "@salesforce/schema/OrderItem.Id";
import ITEM_ORDER_ID_FIELD
	from "@salesforce/schema/OrderItem.OrderId";
import ITEM_PRODUCT_ID_FIELD
	from "@salesforce/schema/OrderItem.Product2Id";
import ITEM_PRODUCT_NAME_FIELD
	from "@salesforce/schema/OrderItem.Product2.Name";
import ITEM_PRODUCT_CODE_FIELD
	from "@salesforce/schema/OrderItem.Product2.ProductCode";
import ITEM_PRODUCT_MATERIAL_ID_FIELD
	from "@salesforce/schema/OrderItem.Product2.Material__c";
import ITEM_PRODUCT_MATERIAL_NAME_FIELD
	from "@salesforce/schema/OrderItem.Product2.Material__r.Name";
import ITEM_PRODUCT_RECORD_TYPE_ID_FIELD
	from "@salesforce/schema/OrderItem.Product2.RecordTypeId";
import ITEM_PRODUCT_RECORD_TYPE_NAME_FIELD
	from "@salesforce/schema/OrderItem.Product2.RecordType.Name";
import ITEM_QTY_FIELD
	from "@salesforce/schema/OrderItem.Quantity";
import ITEM_UNIT_TYPE_FIELD
	from "@salesforce/schema/OrderItem.UnitType__c";
import ITEM_DEPTH_FIELD
	from "@salesforce/schema/OrderItem.Depth__c";
import ITEM_WIDTH_FIELD
	from "@salesforce/schema/OrderItem.Width__c";
import ITEM_HEIGHT_FIELD
	from "@salesforce/schema/OrderItem.Height__c";
import ITEM_DELIVERY_GROUP_FIELD
	from "@salesforce/schema/OrderItem.DeliveryGroup__c";
import ITEM_DISCOUNT_TYPE_FIELD
	from "@salesforce/schema/OrderItem.DiscountType__c";
import ITEM_DISCOUNT_AMOUNT_FIELD
	from "@salesforce/schema/OrderItem.DiscountAmount__c";
import ITEM_BASE_PRICE_FIELD
	from "@salesforce/schema/OrderItem.BasePrice__c";
import ITEM_UNIT_PRICE_FIELD
	from "@salesforce/schema/OrderItem.UnitPrice";
import ITEM_TOTAL_PRICE_FIELD
	from "@salesforce/schema/OrderItem.TotalPrice";
import ITEM_CREATED_DATE_FIELD
	from "@salesforce/schema/OrderItem.CreatedDate";
/* import ITEM_FINISH_FIELD
	from "@salesforce/schema/OrderItem.Finish__c"; */

import WO_ACCOUNT_ID_FIELD from "@salesforce/schema/WorkOrder.AccountId";
import WO_DUE_DATE_FIELD from "@salesforce/schema/WorkOrder.DueDate__c";
import WO_WIDTH_FIELD from "@salesforce/schema/WorkOrder.Width__c";
import WO_HEIGHT_FIELD from "@salesforce/schema/WorkOrder.Height__c";
import WO_DEPTH_FIELD from "@salesforce/schema/WorkOrder.Depth__c";
import WO_MATERIAL_ID_FIELD from "@salesforce/schema/WorkOrder.Material__c";
import WO_ORDER_ID_FIELD from "@salesforce/schema/WorkOrder.Order__c";
import WO_ORDER_PRODUCT_ID_FIELD from "@salesforce/schema/WorkOrder.OrderProduct__c";
import WO_QUANTITY_FIELD from "@salesforce/schema/WorkOrder.Quantity__c";
import WO_TITLE_FIELD from "@salesforce/schema/WorkOrder.Title__c";

export function getFieldApiNames() {
	return [
		`${ITEM_OBJECT.objectApiName}.${ITEM_ID_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_DELIVERY_GROUP_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_PRODUCT_ID_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_PRODUCT_NAME_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_PRODUCT_CODE_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_PRODUCT_MATERIAL_ID_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_PRODUCT_MATERIAL_NAME_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_PRODUCT_RECORD_TYPE_ID_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_PRODUCT_RECORD_TYPE_NAME_FIELD.fieldApiName}`,
		// `${ITEM_OBJECT.objectApiName}.${ITEM_FINISH_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_UNIT_TYPE_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_QTY_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_DEPTH_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_WIDTH_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_HEIGHT_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_DISCOUNT_TYPE_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_DISCOUNT_AMOUNT_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_BASE_PRICE_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_UNIT_PRICE_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_TOTAL_PRICE_FIELD.fieldApiName}`,
		`${ITEM_OBJECT.objectApiName}.${ITEM_CREATED_DATE_FIELD.fieldApiName}`
	];
}

export function convertFromRecord(r) {
	return {
		...createNewProduct(),
		uniqueId: getFieldValue(r, ITEM_ID_FIELD),
		groupId: getFieldValue(r, ITEM_DELIVERY_GROUP_FIELD),
		productId: getFieldValue(r, ITEM_PRODUCT_ID_FIELD),
		productName: getFieldValue(r, ITEM_PRODUCT_NAME_FIELD),
		productCode: getFieldValue(r, ITEM_PRODUCT_CODE_FIELD),
		materialId: getFieldValue(r, ITEM_PRODUCT_MATERIAL_ID_FIELD),
		materialName: getFieldValue(r, ITEM_PRODUCT_MATERIAL_NAME_FIELD),
		productTypeId: getFieldValue(r, ITEM_PRODUCT_RECORD_TYPE_ID_FIELD),
		productTypeName: getFieldValue(r, ITEM_PRODUCT_RECORD_TYPE_NAME_FIELD),
		// finish: getFieldValue(r, ITEM_FINISH_FIELD),
		unitType: getFieldValue(r, ITEM_UNIT_TYPE_FIELD),
		qty: getFieldValue(r, ITEM_QTY_FIELD),
		depth: getFieldValue(r, ITEM_DEPTH_FIELD),
		width: getFieldValue(r, ITEM_WIDTH_FIELD),
		height: getFieldValue(r, ITEM_HEIGHT_FIELD),		
		discountType: getFieldValue(r, ITEM_DISCOUNT_TYPE_FIELD),
		discountAmount: getFieldValue(r, ITEM_DISCOUNT_AMOUNT_FIELD),
		unitPrice: getFieldValue(r, ITEM_BASE_PRICE_FIELD),
		listPrice: getFieldValue(r, ITEM_UNIT_PRICE_FIELD),
		totalPrice: getFieldValue(r, ITEM_TOTAL_PRICE_FIELD),
		createdDate: new Date(getFieldValue(r, ITEM_CREATED_DATE_FIELD)),
		isProduct: getFieldValue(r, ITEM_DISCOUNT_TYPE_FIELD) == "Product",
		isDiscount: getFieldValue(r, ITEM_DISCOUNT_TYPE_FIELD) == "Discount",
		isPercentage: getFieldValue(r, PRODUCT_DISCOUNT_TYPE_FIELD) == "Percentage",
		isFixed: getFieldValue(r, PRODUCT_DISCOUNT_TYPE_FIELD) == "Fixed Amount",
		isNew: false
	};
}

export function convertFromApexRecord(r) {
	return {
		...createNewProduct(),
		uniqueId: r.Id,
		groupId: r.DeliveryGroup__c,
		productId: r.Product2Id,
		productName: r.Product2.Name,
		productCode: r.Product2.ProductCode,
		materialId: r.Product2.Material__c,
		materialName: r.Product2.Material__r?.Name,
		productTypeId: r.Product2.RecordTypeId,
		productTypeName: r.Product2.RecordType?.DeveloperName,
		unitType: r.UnitType__c,
		qty: r.Quantity,
		depth: r.Depth__c,
		width: r.Width__c,
		height: r.Height__c,
		discountType: r.DiscountType__c,
		discountAmount: r.DiscountAmount__c,
		unitPrice: r.BasePrice__c,
		listPrice: r.UnitPrice,
		totalPrice: r.TotalPrice,
		createdDate: new Date(r.CreatedDate),
		isProduct: r.Product2.RecordType?.DeveloperName == "Product",
		isDiscount: r.Product2.RecordType?.DeveloperName == "Discount",
		isPercentage: r.DiscountType__c == "Percentage",
		isFixed: r.DiscountType__c == "Fixed Amount",
		isNew: false
	};
}

/**
 * @author Fernando Gomez
 * @since 10/30.2022
 * @versino 1.0
 */
export default class OrderProductManager extends NavigationMixin(InputBase) {
	@api
	recordId;

	@track
	groups = [];

	@track
	discounts = [];

	mode = "view";

	order;
	refreshHandlerId;
	wiredDeliveryGroupsResult;
	openGroupSections;

	isReady = false;
	isSaveDisabled = true;
	isLoading = false;
	searchProductsKey = null;

	get listViewOptions() {
		return [{
			label: "Tiles",
			value: "tiles",
			iconName: "utility:tile_card_list",
			isChecked: true
		}, {
			label: "List",
			value: "list",
			iconName: "utility:list",
			isChecked: false
		}];
	}

	get title() {
		return "Products";
	}

	get isDraft() {
		return getFieldValue(this.order.data, STATUS_FIELD) == "Draft";
	}

	get subtitle() {
		return `<a href="/${getFieldValue(this.order.data, ACCOUNT_ID_FIELD) || ""}">
			${getFieldValue(this.order.data, ACCOUNT_NAME_FIELD)}</a>`;
	}

	get hideAddProducts() {
		return this.searchProductsKey != null;
	}

	get dueDate() {
		return getFieldValue(this.order.data, DUE_DATE_FIELD);
	}

	get accountId() {
		return getFieldValue(this.order.data, DUE_DATE_FIELD);
	}

	@wire(getRecord, { 
		recordId: "$recordId",
		fields: [
			NAME_FIELD,
			DUE_DATE_FIELD,
			STATUS_FIELD,
			ACCOUNT_ID_FIELD,
			ACCOUNT_NAME_FIELD
		]
	})
	order;

	connectedCallback() {
		this.getDeliveryGroupsAndProducts();
		this.getDiscounts();
	}

	handleOnViewChange(event) {
		switch (event.detail.value) {
			case "view":
			case "edit":
				this.handleOnModeChange(event);
				break;
			case "tiles":
			case "list":
				break;
			default:
				break;
		}
	}

	handleOnAddGroupClick() {
		this.addNewGroup();
	}

	handleOnProductCreated(event) {
		this.addProduct(
			event.target.dataset.groupId,
			event.detail);
	}

	handleOnProductChange(event) {
		this.updateProduct(event.detail);
	}

	handleOnProductDelete(event) {
		this.deleteProduct(event.detail);
	}

	handleOnSearchProductsChange(event) {
		this.searchProductsKey =
			event.target.value?.trim().toLowerCase() || null;
		this.filterProducts();
	}

	handleSaveClick(event) {
		this._save();
	}

	handleOnProductDragStart(event) {
		let product = event.detail;
		if (product)
			this.groups
				.filter(g => g.uniqueId != event.detail.groupId)
				.forEach(g => this.applyChangesToGroup(
					g.uniqueId,
					{ isDropEnabled: true }));
	}

	handleOnProductDragEnd(event) {
		this.groups
			.forEach(g => this.applyChangesToGroup(
				g.uniqueId,
				{
					isDropEnabled: false,
					isDragging: false
				}));
	}

	handleOnDragOver(event) {
		event.preventDefault();
		this.applyChangesToGroup(
			event.currentTarget.dataset.groupId,
			{ isDragging: true });
	}

	handleOnDragLeave(event) {
		this.applyChangesToGroup(
			event.currentTarget.dataset.groupId,
			{ isDragging: false });
	}

	handleOnDrop(event) {
		let product = JSON.parse(event.dataTransfer.getData("text/json"));
		let sourceGroupId = product.groupId;
		let targetGroupId = event.currentTarget.dataset.groupId;
		this.moveProduct(product.uniqueId, targetGroupId, sourceGroupId);
	}

	handleOnGroupEdit() {
		this.getDeliveryGroupsAndProducts();
	}

	handleOnGroupClone() {
		this.getDeliveryGroupsAndProducts();
	}

	handleOnGroupDelete(event) {
		this.deleteGroup(event.detail.recordId);
	}

	handleOnCreateWorkOrder(event) {
		LightningConfirm.open({
			label: `Confirm New Work Order`,
			message: [
				"A new Wok Order will be created for this product:",
				`${event.detail.productName}.\nAre you sure you wish to proceed?`
			].join("\n"),
			variant: "header",
			theme: "warning"
		})
		.then(result => {
			if (result)
				this.createNewWorkOrder(event.detail);
		});
	}

	getDeliveryGroupsAndProducts() {
		getDeliveryGroups({
			orderId: this.recordId
		})
		.then(data => {
			// this.wiredDeliveryGroupsResult = result;
			this.groups = [
				...data.map(r => ({
					...createGroupFromApexRecord(r),
					products: r.OrderProducts__r?.map(
						op => convertFromApexRecord(op)) || []
				}),
				{
					uniqueId: "null",
					name: "Ungrouped",
					isPlaceHolder: true,
					products: []
				})
			];

			// if the order is in draft, we enable edit
			if (this.isDraft)
				this.mode = "edit";
		})
		.catch(error => {
			console.error(error);
			this.toast("Error",
				`There was a problem. ${error.body?.message}`,
				"error",
				"sticky");
		});
	}

	getDiscounts() {
		getOrderProductsByProductType({
			orderId: this.recordId,
			productTypeName: "Discount"
		})
		.then(data => {
			this.discounts = data.map(r => convertFromApexRecord(r));
		})
		.catch(error => {
			console.error(error);
			this.toast("Error",
				`There was a problem. ${error.body?.message}`,
				"error",
				"sticky");
		});
	}

	addNewGroup() {
		const group = {
			...createNewDelvieryGroup(),
			uniqueId: `unsaved_${this.groups.length + 1}`,
			name: `${DEFAULT_GROUP_NAME} #${this.groups.length + 1}`,
			dueDate: this.dueDate
		};
		this.groups.push(group);
		this.createNewGroupRecord(group);
	}

	deleteGroup(groupId) {
		let index = this.groups.findIndex(g => g.uniqueId == groupId);
		const group = this.groups.splice(index, 1)[0];

		const fallback = (error) => {
			console.error(error);
			// put the group back on its place
			this.groups.splice(index, 0, group);
			this.toast("Error",
				`Group was not deleted. There was a problem. ${
					error.body?.message}`,
				"error",
				"sticky");
		};
		
		// first, we remove all products
		// inside the group...
		saveOrderProducts({
			itemsToUpsert: [],
			itemsToDelete: group.products.map(p => p.uniqueId)
		})
		.then(() => deleteRecord(groupId).catch(fallback))
		.catch(fallback);
	}

	createNewGroupRecord(group) {
		createRecord({
			apiName: GROUP_OBJECT.objectApiName,
			fields: {
				...createGroupRecord(group),
				Order__c: this.recordId
			}
		})
		.then(result => {
			this.sortGroups();
			this.applyChangesToGroup(
				group.uniqueId,
				{
					uniqueId: result.id
				});
		})
		.catch(error =>
			this.toast("Error",
				`Group was not created. There was a problem. ${error.body?.message}`,
				"error",
				"sticky"));
	}

	addProduct(groupId, product) {
		const newProduct = {
			...product
		};

		if (newProduct.isProduct) {
			newProduct.groupId = groupId;
			this.getGroupById(groupId).products.push(newProduct);
		}
		
		if (newProduct.isDiscount) {
			this.discounts.push(newProduct);
		}
		
		this.applyChangesToProduct(
			groupId,
			newProduct.uniqueId,
			newProduct.isProduct,
			newProduct.isDiscount,
			newProduct);
		this.saveProduct(newProduct);
	}

	updateProduct(product) {
		this.applyChangesToProduct(
			product.groupId,
			product.uniqueId,
			product.isProduct,
			product.isDiscount,
			product);
		this.saveProduct(product);
	}

	moveProduct(productId, targetGroupId, sourceGroupId) {
		let sourceGroup = this.getGroupById(sourceGroupId);
		// remove from dource group
		let indexInSource = sourceGroup.products.findIndex(p => p.uniqueId == productId);
		let product = sourceGroup.products.splice(indexInSource, 1)[0];
		// group id must change
		product.groupId = targetGroupId;
		sourceGroup.products = [...sourceGroup.products];
		// and the source group reference to products must change as well
		// add to target group
		let targetGroup = this.getGroupById(targetGroupId);
		targetGroup.products = [
			...targetGroup.products,
			product
		].sort((a, b) => a.createdDate - b.createdDate);

		// and save info
		this.saveProduct(product);
	}

	saveProduct(product) {
		this.removeErrorFromProduct(product);
		saveOrderProducts({
			itemsToUpsert: [this.convertToRecord(product)],
			itemsToDelete: []
		})
		.then(result => {
			const prod = convertFromApexRecord(result[0]);

			// calculated fields
			const changes = {
				listPrice: prod.listPrice,
				totalPrice: prod.totalPrice
			};

			if (product.isNew) {
				changes.isNew = false;
				changes.uniqueId = prod.uniqueId;
			}

			console.log("after save: ");
			this.applyChangesToProduct(
				product.groupId,
				product.uniqueId,
				product.isProduct,
				product.isDiscount,
				changes);

			// is product changes we need to refresh
			// the discount number
			if (product.isProduct)
				this.getDiscounts();

			// tofiy the view the order totals have changed
			notifyRecordUpdateAvailable([{ recordId: this.recordId }]);
		})
		.catch(error =>
			this.addErrorToProduct(
				product,
				"Product was not created",
				error));
	}

	deleteProduct(product) {
		if (product.isNew)
			this.removeProduct(
				product.groupId,
				product.uniqueId,
				product.isProduct,
				product.isDiscount);
		else {
			this.applyChangesToProduct(
				product.groupId,
				product.uniqueId,
				product.isProduct,
				product.isDiscount,
				{
					isDisabled: true
				});

			removeErrorFromProduct(product);
			saveOrderProducts({
				itemsToUpsert: [],
				itemsToDelete: [product.uniqueId]
			})
			.then(() => {
				this.removeProduct(
					product.groupId,
					product.uniqueId,
					product.isProduct,
					product.isDiscount);

				// is product changes we need to refresh
				// the discount number
				if (product.isProduct)
					this.getDiscounts();

				// tofiy the view the order totals have changed
				notifyRecordUpdateAvailable([{ recordId: this.recordId }]);
			})
			.catch(error =>
				this.addErrorToProduct(
					product,
					"Product was not deleted",
					error));
		}
	}

	filterProducts() {
		let key = this.searchProductsKey;
		this.groups.forEach(g =>
			g.products.forEach(p =>
				this.applyChangesToProduct(
					p.groupId,
					p.uniqueId,
					p.isProduct,
					p.isDiscount,
					{
						isHidden: key ?
							!p.productName.toLowerCase().includes(key) &&
							!p.productCode.toLowerCase().includes(key) : false
					})));
	}

	createNewWorkOrder(product) {
		createRecord({
			apiName: WORK_ORDER_OBJECT.objectApiName,
			fields: this.createWorkOrderRecord(product)
		})
		.then(result => {
			this[NavigationMixin.Navigate]({
				type: "standard__recordPage",
				attributes: {
					recordId: result.id,
					actionName: "view"
				},
			});
		})
		.catch(error =>
			this.toast("Error",
				`Work Order was not created. There was a problem. ${error.body?.message}`,
				"error",
				"sticky"));
	}

	convertToRecord(product) {
		let record = {};

		if (product.isNew) {
			record[ITEM_ORDER_ID_FIELD.fieldApiName] = this.recordId;
			record[ITEM_PRODUCT_ID_FIELD.fieldApiName] = product.productId;
		} else
			record[ITEM_ID_FIELD.fieldApiName] = product.uniqueId;
		
		// product fields
		if (product.isProduct) {
			record[ITEM_DELIVERY_GROUP_FIELD.fieldApiName] = product.groupId;
			record[ITEM_QTY_FIELD.fieldApiName] = product.qty;
			record[ITEM_UNIT_TYPE_FIELD.fieldApiName] = product.unitType;
			record[ITEM_DEPTH_FIELD.fieldApiName] = product.depth;
			record[ITEM_WIDTH_FIELD.fieldApiName] = product.width;
			record[ITEM_HEIGHT_FIELD.fieldApiName] = product.height;
			record[ITEM_BASE_PRICE_FIELD.fieldApiName] = product.unitPrice;
			record[ITEM_UNIT_PRICE_FIELD.fieldApiName] = product.listPrice;
		}
		
		// discount fields
		if (product.isDiscount) {
			record[ITEM_QTY_FIELD.fieldApiName] = 1;
			record[ITEM_DISCOUNT_TYPE_FIELD.fieldApiName] = product.discountType;
			record[ITEM_DISCOUNT_AMOUNT_FIELD.fieldApiName] = product.discountAmount;

			if (product.isFixed) {
				record[ITEM_BASE_PRICE_FIELD.fieldApiName] =
					product.discountAmount * -1;
				record[ITEM_UNIT_PRICE_FIELD.fieldApiName] =
					product.discountAmount * -1;
			}
		}

		return record;
	}

	createWorkOrderRecord(product) {
		let record = {};
		record[WO_ACCOUNT_ID_FIELD.fieldApiName] = this.accountId;
		record[WO_DUE_DATE_FIELD.fieldApiName] = this.dueDate;
		record[WO_WIDTH_FIELD.fieldApiName] = product.width;
		record[WO_HEIGHT_FIELD.fieldApiName] = product.height;
		record[WO_DEPTH_FIELD.fieldApiName] = product.depth;
		record[WO_MATERIAL_ID_FIELD.fieldApiName] = product.materialId;
		record[WO_ORDER_ID_FIELD.fieldApiName] = this.recordId;
		record[WO_ORDER_PRODUCT_ID_FIELD.fieldApiName] = product.uniqueId;
		record[WO_QUANTITY_FIELD.fieldApiName] = product.qty;
		record[WO_TITLE_FIELD.fieldApiName] = `${product.productName}`;
		return record;
	}

	toast(title, msg, variant, mode) {
		this.dispatchEvent(new ShowToastEvent({
			title: title,
			message: msg,
			variant: variant,
			mode: mode
		}));
	}

	getFieldFullName(object, field) {
		return `${object.objectApiName}.${field.fieldApiName}`;
	}

	addErrorToProduct(product, errorTitle, errorObject) {
		console.error(errorObject);
		let msg = [
			errorTitle,
			...this.getDmlErrors(errorObject)
		].join(". ");
		
		addErrorToProduct(product, msg, errorObject);
		this.applyChangesToProduct(
			product.groupId,
			product.uniqueId,
			product.isProduct,
			product.isDiscount,
			product);
	}

	removeErrorFromProduct(product) {
		removeErrorFromProduct(product);
		this.applyChangesToProduct(
			product.groupId,
			product.uniqueId,
			product.isProduct,
			product.isDiscount,
			product);
	}

	getGroupById(groupId) {
		return this.groups.find(g => g.uniqueId == (groupId || "null"));
	}

	getDiscountById(discountId) {
		return this.discounts.find(d => d.uniqueId == discountId);
	}

	applyChangesToGroup(groupId, changes) {
		let group = this.getGroupById(groupId);
		Object.keys(changes).forEach(
			k => {
				let v = changes[k];
				group[k] = v == null ? null : v;
			});
	}

	applyChangesToProduct(groupId, uniqueId, isProduct, isDiscount, changes) {
		if (isProduct) {
			let group = this.getGroupById(groupId);
			let indexInGroup = group.products.findIndex(p => p.uniqueId == uniqueId);
			let groupProducts = [...group.products];
			let product = groupProducts[indexInGroup];
			groupProducts[indexInGroup] = {
				...product,
				...changes
			};
			// but here we do have to change the
			// reference in products otherwise the UI
			// weon't recognize it
			group.products = groupProducts;
		}

		if (isDiscount) {
			const discountIndex = this.discounts.findIndex(d => d.uniqueId == uniqueId);
			const discount = this.getDiscountById(uniqueId);
			this.discounts[discountIndex] = {
				...discount,
				...changes
			};
			this.discounts = [...this.discounts];
		}
	}

	removeProduct(groupId, uniqueId, isProduct, isDiscount) {
		if (isProduct) {
			let group = this.getGroupById(groupId);
			let indexInGroup = group.products.findIndex(p => p.uniqueId == uniqueId);
			let groupProducts = [...group.products];
			groupProducts.splice(indexInGroup, 1);
			group.products = groupProducts;
		}

		if (isDiscount) {
			const discountIndex =
				this.discounts.findIndex(d => d.uniqueId == uniqueId);
			this.discounts.splice(discountIndex, 1);
			this.discounts = [...this.discounts];
		}
	}

	sortGroups() {
		/* try {
		this.groups.sort((n, o) => {
			let nt = n.dueDate?.getTime() || 0;
			let ot = o.dueDate?.getTime() || 0;
			return nt - ot;
		});
		} catch (e) {
			console.error(e.stack)
		} */
	}
}