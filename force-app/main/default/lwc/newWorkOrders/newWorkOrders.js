import { api, wire, track } from 'lwc';
import LwcBase from 'c/lwcBase';
import { NavigationMixin } from 'lightning/navigation';

import getSingleOrderProduct
	from "@salesforce/apex/OrderProductManagerCtrl.getSingleOrderProduct";
import getOrderProductsByProductType
	from "@salesforce/apex/OrderProductManagerCtrl.getOrderProductsByProductType";
import createWorkOrdersFromOrderItems
	from "@salesforce/apex/NewWorkOrdersCtrl.createWorkOrdersFromOrderItems";
import getWorkOrdersForOrder
	from "@salesforce/apex/NewWorkOrdersCtrl.getWorkOrdersForOrder";
import getExistingWorkOrders
	from "@salesforce/apex/NewWorkOrdersCtrl.getExistingWorkOrders";
import getDefaultSopPerProduct
	from "@salesforce/apex/NewWorkOrdersCtrl.getDefaultSopPerProduct";

import { newWorkOrdersLabels } from "c/constants";
import { createNewProduct } from "c/productCard";
import RecordLookupModal from "c/recordLookupModal";

export function calculateAggregations(items) {
	const parentItemIds = {};
	items.filter(item => item.isPart)
		.forEach(item => (parentItemIds[item.parentItemId] = true));
	items.filter(item => parentItemIds[item.uniqueId])
		.forEach(item => (item.hasParts = true));
}

export function convertFromApexRecord(r, orderId) {
	const dueDate = r.DeliveryGroup__r?.DueDate__c || r.Order?.DueDate__c;
	return {
		...createNewProduct(),
		uniqueId: r.Id,
		orderId,
		itemNo: r.OrderItemNumber,
		createdDate: new Date(r.CreatedDate),
		dueDate: dueDate || null,
		parentItemId: r.ParentOrderProduct__c,
		parentItemProductName: r.ParentOrderProduct__r?.Product2?.Name,
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
		isProduct: r.Product2.RecordType?.DeveloperName == "Product",
		isDiscount: r.Product2.RecordType?.DeveloperName == "Discount",
		isPercentage: r.DiscountType__c == "Percentage",
		isFixed: r.DiscountType__c == "Fixed Amount",
		isPart: r.ParentOrderProduct__c != null,
		hasParts: false,
		showParts: false,
		isNew: false,
		isVisible: r.ParentOrderProduct__c == null
	};
}

export default class NewWorkOrders extends NavigationMixin(LwcBase) {
	@api
	orderId;
	
	@api
	orderProductId;

	@track
	productGroups = [];

	workOrdersRecordId;
	orderProductFieldApiNames;
	existingWorkOrders = {};
	workOrderFieldApiNames = [];
	workOrderByProductMap = {};
	workOrderByKey = {};
	wiredOrderProductsResult;
	selectAll = false;
	isLoading = false;
	isComplete = false;

	get labels() {
		return newWorkOrdersLabels;
	}

	get workOrderActionOptions() {
		return [
			{
				label: 'New Work Order',
				value: 'new'
			},
			{
				label: 'Add to Work Order',
				value: 'add'
			}
		];
	}

	get isCreateItemsButtonDisabled() {
		return this.productGroups.filter(p => p.isSelected).length == 0;
	}

	get itemsHelpText() {
		return "some help texty";
	}

	get workOrdersHelpText() {
		return "some help texty";
	}

	get baseField() {
		return {
			"order": 1,
			"isRequired": false,
			"isLabelDisabled": false,
			"isRequiredDisabled": false,
			"isText": false,
			"isFromOptions": false,
			"isOptionRestricted": false,
			"isEditionAllowed": false
		};
	}

	get sopNameField() {
		return {
			...this.baseField,
			"fieldLabel": "SOP Name",
			"fieldApiName": "Name",
			"fieldTitle": "SOP Name"
		};
	}

	get workOrderTitleField() {
		return {
			...this.baseField,
			"fieldLabel": "Work Order",
			"fieldApiName": "Title__c",
			"fieldTitle": "Work Order Title (Title__c)"
		};
	}

	get sopCustomButtonIcon() {
		return {
			iconName: "utility:clear",
			title: "Remove Selected SOP"
		};
	}

	get workOrderCustomButtonIcon() {
		return {
			iconName: "utility:clear",
			title: "Remove Work Order"
		};
	}

	@wire(getExistingWorkOrders, {
		orderId: "$orderId"
	})
	wiredExistingWorkOrders({ error, data }) {
		if (data) {
			console.log("newWorkOrders.wiredExistingWorkOrders(): work orders fetched");
			this.existingWorkOrders = data;
			this.fetchItems();
		} else if (error) {
			this.addError("Error fetching Order Products", error);
		}
	}

	@api
	handleOnSubmitClick() {
		console.log("newWorkOrders.handleOnSubmitClick()");
		if (this.validateInputs(".validate")) {
			this.isLoading = true;
			const selectedProducts = 
				this.productGroups
					.map(p => this.completeItem(p))
					.filter(p => p.isSelected);

			createWorkOrdersFromOrderItems({
				orderItems: selectedProducts
			})
			.then(data => {
				this.isLoading = false;
				data.forEach((r, i) => {
					const p = selectedProducts[i];
					p.workOrderId = r.workOrderId;
					// if work order, we need to create a link
					// Add the Work Order link property
					if (p.workOrderId) {
						p.newWorkOrderRecordLink =
							`/lightning/r/WorkOrder/${p.workOrderId}/view`;
					}
				});
				this.isComplete = true;
				this.customEvent("createnewworkorderscomplete", data);
			})
			.catch(error => {
				this.isLoading = false;
				this.addError("Error creating Work Orders", error);
			});
		}
	}

	handleOnSelectedAllClick(event) {
		this.selectAll = event.target.checked;
		this.productGroups.forEach(p =>
			this.setSelectionStatus(p, event.target.checked));
	}

	handleOnProductSelectedClick(event) {
		const product = this.productGroups.find(p =>
			p.uniqueId == event.target.dataset.uniqueId);
		this.setSelectionStatus(product, event.target.checked);
	}

	handleOnSplitClick(event) {
		event.preventDefault();
		const index = this.productGroups.findIndex(p =>
			p.uniqueId == event.target.dataset.uniqueId);
		const product = this.productGroups[index];

		this.productGroups.splice(
			index,
			1,
			...product.items.map(item => {
				const workOrders = this.workOrderByProductMap[item.uniqueId] || [];
				const isSelected = workOrders.length == 0;
				return {
					...item,
					items: [item],
					sopId: item.sopId,
					workOrders,
					isSelected,
					isSopDisabled: !isSelected,
					allowJoin: true
				};
			}));
	}

	handleOnJoinClick(event) {
		/* event.preventDefault();
		const index = this.productGroups.findIndex(p =>
			p.uniqueId == event.target.dataset.uniqueId);
		const product = this.productGroups[index]; */

		// 
	}

	handleOnSopSelectClick(event) {
		const product = this.productGroups.find(p =>
			p.uniqueId == event.target.dataset.uniqueId);
		// product.sopId = event.detail.recordId;
		this.setSelectionStatus(product, true);
		
		RecordLookupModal.open({
			label: 'Select SOP',
			objectApiName: 'SopProduct__c',
			size: "small",
			columns: [
				{
					label: 'SOP',
					fieldName: 'SopName__c',
					type: 'text'
				},
				{
					label: 'Is Default?',
					fieldName: 'IsDefault__c',
					type: 'boolean',
					initialWidth: 100
				},
				{
					label: 'SOP ID',
					fieldName: 'SOP__c',
					type: 'text',
					isHidden: true
				}
			],
			filters: [
				{
					fieldPath: 'Product__c',
					operator: 'eq',
					value: product.productId
				},
				{
					fieldPath: 'IsSopActive__c',
					operator: 'eq',
					value: true
				}
			]
		})
		.then(selectedRecord => {
			if (selectedRecord) {
				this.handleOnSelectSopChange(product.uniqueId, selectedRecord);
			}
		})
		.catch(error => this.addError('Error selecting SOP', error));
	}

	handleOnSelectWorkOrderClick(event) {
		const product = this.productGroups.find(p =>
			p.uniqueId == event.target.dataset.uniqueId);
		// product.workOrderId = event.detail.recordId;
		this.setSelectionStatus(product, true);

		RecordLookupModal.open({
			label: 'Select Work Order',
			objectApiName: 'WorkOrder',
			selectedId: product.workOrderId,
			size: "small",
			columns: [
				{
					label: 'Title',
					fieldName: 'Title__c',
					type: 'text'
				}, {
					label: 'Work Order Number',
					fieldName: 'WorkOrderNumber',
					type: 'text',
					initialWidth: 160
				}
			],
			filters: [
				{
					fieldPath: 'Product__c',
					operator: 'eq',
					value: product.productId
				}, {
					fieldPath: 'UnitType__c',
					operator: 'eq',
					value: product.unitType
				}, {
					fieldPath: 'Width__c',
					operator: 'eq',
					value: product.width
				}, {
					fieldPath: 'Height__c',
					operator: 'eq',
					value: product.height
				}, {
					fieldPath: 'Depth__c',
					operator: 'eq',
					value: product.depth
				}, {
					fieldPath: 'Status',
					operator: 'eq',
					value: 'New'
				}
			]
		})
		.then(selectedRecord => {
			if (selectedRecord) {
				this.handleOnSelectWorkOrderChange(product.uniqueId, selectedRecord);
			}
		})
		.catch(error =>
			this.addError('Error selecting Work Order', error));
	}

	handleOnRefresh() {
		this.fetchItems();
	}

	handleWorkOrderActionChange(event) {
		const product = this.productGroups.find(p =>
			p.uniqueId == event.target.dataset.uniqueId);
		product.workOrderAction = event.detail.value;
		product.showWorkOrderRecordPicker = product.workOrderAction == "add";
		product.showSopRecordPicker = product.workOrderAction == "new";

		if (product.showWorkOrderRecordPicker &&
				!product.workOrderOptions) {
			this.getWorkOrderOptions(product);
		}
		
		this.setSelectionStatus(product, true);
	}

	handleOnSelectSopChange(uniqueId, selectedRecord) {
		const product = this.productGroups.find(p => p.uniqueId == uniqueId);
		product.sopId = selectedRecord.record?.SOP__c;
		product.sopRecord = {
			Id: selectedRecord.record?.SOP__c,
			Name: selectedRecord.record?.SopName__c
		};
		product.isDefaultSopSelected =
			product.defaultSopId != null &&
			product.sopId == product.defaultSopId;
		this.setSelectionStatus(product, true);
	}

	handleOnRemoveSopClick(event) {
		const product = this.productGroups.find(p =>
			p.uniqueId == event.target.dataset.uniqueId);
		product.sopId = null;
		product.sopRecord = null;
		product.isDefaultSopSelected = false;
		this.setSelectionStatus(product, true);
	}

	handleOnDefaultSopSelectClick(event) {
		const product = this.productGroups.find(p =>
			p.uniqueId == event.target.dataset.uniqueId);
		if (product.defaultSopId) {
			product.sopId = product.defaultSopId;
			product.sopRecord = product.defaultSopRecord;
			product.isDefaultSopSelected = true;
			this.setSelectionStatus(product, true);
		}
	}

	handleOnDueDateChange(event) {
		const product = this.productGroups.find(p =>
			p.uniqueId == event.target.dataset.uniqueId);
		product.dueDate = event.target.value;
	}

	handleOnSelectWorkOrderChange(uniqueId, selectedRecord) {
		const product = this.productGroups.find(p => p.uniqueId == uniqueId);
		product.workOrderId = selectedRecord.recordId;
		product.workOrderRecord = selectedRecord.record;
		this.setSelectionStatus(product, true);
	}

	handleOnRemoveWorkOrderClick(event) {
		const product = this.productGroups.find(p =>
			p.uniqueId == event.target.dataset.uniqueId);
		product.workOrderId = null;
		product.workOrderRecord = null;
		this.setSelectionStatus(product, true);
	}

	handleOnViewWorkOrderClick(event) {
		const workOrderId = event.target.dataset.workOrderId;
		this.navigateToRecord(workOrderId, 'WorkOrder');
	}

	fetchItems() {
		const onerror = (error) => {
			this.addError("Error fetching Order Products", error);
		};

		if (this.orderProductId) {
			getSingleOrderProduct({
				orderProductId: this.orderProductId
			})
			.then(data => this.processItems([data]))
			.catch(onerror);
		} else {
			getOrderProductsByProductType({
				orderId: this.orderId,
				productTypeName: "Product"
			})
			.then(data => this.processItems(data))
			.catch(onerror);
		}
	}

	processItems(data) {
		const mapped = {};
		const parentItemIds = {};

		data.forEach((r, order) => {
			const item = convertFromApexRecord(r, this.orderId);
			const workOrders =
				(this.existingWorkOrders[item.uniqueId] || []).map(wo => ({
					workOrderId: wo.Id,
					title: wo.Title__c
				}));
			this.workOrderByProductMap[item.uniqueId] = workOrders;

			if (item.isPart) {
				parentItemIds[item.parentItemId] = true;
			}

			let key = [
				item.productId,
				item.unitType,
				item.width,
				item.height,
				item.depth
			].join(":");

			if (mapped[key]) {
				const p = mapped[key];
				// key added, incresa qty and add the item
				p.qty += item.qty;
				p.items.push(item);
				p.workOrders.push(...workOrders);
				p.isSelected = p.workOrders.length == 0;
				p.isWorkOrderActionDisabled = !p.isSelected;
				p.isWorkOrderRecordPickerDisabled = !p.isSelected;
				p.isSopDisabled = !p.isSelected;
				p.allowSplit = true;
			} else {
				// first time adding the key
				const isSelected = workOrders.length == 0;
				mapped[key] = {
					...item,
					order,
					items: [item],
					workOrders,
					workOrderAction: 'new',
					isSelected,
					isSopDisabled: !isSelected,
					isWorkOrderActionDisabled: !isSelected,
					isWorkOrderRecordPickerDisabled: !isSelected,
					allowSplit: false,
					allowJoin: false,
					sopId: null,
					sopRecord: null,
					defaultSopId: null,
					defaultSopRecord: null,
					isDefaultSopSelected: null,
					showSopRecordPicker: true,
					workOrderId: null,
					workOrderRecord: null,
					showWorkOrderRecordPicker: false
				};
			}
		});

		// we convert the mapp to an array
		this.productGroups = Object.values(mapped);
		calculateAggregations(this.productGroups);
		this.productGroups.sort((a, b) => {
			if (a.hasParts && !b.hasParts) {
				return 1;
			}

			if (!a.hasParts && b.hasParts) {
				return -1;
			}

			return a.createdDate.getTime() - b.createdDate.getTime();
		});

		this.selectAll = this.productGroups.every(p => p.isSelected);
		this.fetchDefaultSops();
	}

	completeItem(product) {
		// product.isSelected = false;
		product.isComplete = true;
		product.isWorkOrderActionDisabled = true;
		return product;
	}

	navigateToRecord(recordId, objectApiName) {
		this[NavigationMixin.Navigate]({
			type: 'standard__recordPage',
			attributes: {
				recordId: recordId,
				objectApiName: objectApiName, // e.g., 'WorkOrder'
				actionName: 'view'
			}
		});
	}

	getWorkOrderOptions(product) {
		getWorkOrdersForOrder({
			productId: product.productId,
			unitType: product.unitType,
			width: product.width,
			height: product.height,
			depth: product.depth,
			searchTerm: null
		})
		.then(data => {
			if (data.length == 0) {
				product.workOrderOptions = null;
				/* product.showWorkOrderRecordPicker = false;
				product.workOrderAction = 'new'; */
			} else {
				product.workOrderOptions = data.map(wo => ({
					label: `${wo.Title__c}, No: ${wo.WorkOrderNumber}`,
					value: wo.Id
				}));
			}
		})
		.catch(error => {
			this.addError("Error fetching Work Orders", error);
		});
	}

	setSelectionStatus(product, value) {
		product.isSelected = value;
		product.isSopDisabled = !value;
		product.isWorkOrderActionDisabled = !value;
		product.isWorkOrderRecordPickerDisabled = !value;
		product.sopCustomButtonIcon =
			product.isSopDisabled ? null : this.sopCustomButtonIcon;
		product.workOrderCustomButtonIcon =
			product.isWorkOrderActionDisabled ? null : this.workOrderCustomButtonIcon;
		this.selectAll = this.productGroups.every(p => p.isSelected);
	}

	fetchDefaultSops() {
		if (!this.productGroups || this.productGroups.length === 0) {
			return;
		}

		const productIds = this.productGroups.map(p => p.productId);
		getDefaultSopPerProduct({ productIds })
			.then(defaultSops => {
				this.productGroups.forEach(p => {
					const sop = defaultSops[p.productId];
					if (sop) {
						p.sopId = sop.Id;
						p.sopRecord = sop;
						p.defaultSopId = sop.Id;
						p.defaultSopRecord = sop;
						p.isDefaultSopSelected = true;
					}
				});
			})
			.catch(error => {
				this.addError("Error fetching default SOPs", error);
			});
	}
}