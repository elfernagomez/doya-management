import { api, wire, track } from 'lwc';
import LwcBase from 'c/lwcBase';
import { getRelatedListRecords } from 'lightning/uiRelatedListApi';
import { getFieldValue } from "lightning/uiRecordApi";

import {
	getFieldApiNames,
	convertFromRecord
} from "c/orderProductManager";

import WO_ORDER_OBJECT from "@salesforce/schema/WorkOrder";

import WO_TITLE_FIELD from "@salesforce/schema/WorkOrder.Title__c";
import WO_ORDER_PRODUCT_FIELD from "@salesforce/schema/WorkOrder.OrderProduct__c";
import WO_STATUS_FIELD from "@salesforce/schema/WorkOrder.Status";

export default class NewWorkOrders extends LwcBase {
	@api
	recordId;

	@track	
	productGroups = [];

	orderProductFieldApiNames = [];
	workOrderFieldApiNames = [];
	workOrderByProductMap = {};

	selectAll = false;

	get isCreateItemsButtonDisabled() {
		return this.productGroups.filter(p => p.isSelected).length == 0;
	}

	connectedCallback() {
		// next is the work orders
		this.workOrderFieldApiNames = [
			`${WO_ORDER_OBJECT.objectApiName}.${WO_TITLE_FIELD.fieldApiName}`,
			`${WO_ORDER_OBJECT.objectApiName}.${WO_ORDER_PRODUCT_FIELD.fieldApiName}`,
			`${WO_ORDER_OBJECT.objectApiName}.${WO_STATUS_FIELD.fieldApiName}`
		];
	}

	@wire(getRelatedListRecords, {
		parentRecordId: "$recordId",
		relatedListId: "WorkOrders__r",
		fields: "$workOrderFieldApiNames"
	})
	wiredWorkOrders({ error, data }) {
		if (data) {
			data.records.forEach(r => {
				const orderProductId = getFieldValue(r, WO_ORDER_PRODUCT_FIELD);
				const workOrderTitle = getFieldValue(r, WO_TITLE_FIELD);
				const workOrderStatus = getFieldValue(r, WO_STATUS_FIELD);

				// find the product group with this orderProductId
				const p = this.workOrderByProductMap[orderProductId];
				const item = {
					workOrderTitle,
					workOrderStatus
				};

				if (p) {
					p.push(item);
				} else {
					this.workOrderByProductMap[orderProductId] = [item];
				}
			});

			this.orderProductFieldApiNames = getFieldApiNames();
		} else if (error) {
			this.addError("Error fetching Order Products", error);
		}
	}

	@wire(getRelatedListRecords, {
		parentRecordId: "$recordId",
		relatedListId: "OrderItems",
		fields: "$orderProductFieldApiNames"
	})
	wiredOrderProducts({ error, data }) {
		if (data) {
			const mapped = {};
			data.records.forEach(r => {
				const item = convertFromRecord(r)
				const workOrders = this.workOrderByProductMap[item.uniqueId] || [];

				let key = [
					item.productCode,
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
					p.isSopDisabled = !p.isSelected;
				} else {
					// first time adding the key
					mapped[key] = {
						...item,
						items: [item],
						sopId: null,
						isSelected: workOrders.length == 0,
						isSopDisabled: workOrders.length > 0,
						workOrders
					};
				}
			});

			// we convert the mapp to an array
			this.productGroups = Object.values(mapped);
		} else if (error) {
			this.addError("Error fetching Order Products", error);
		}
	}

	handleOnSelectedAllClick(event) {
		this.selectAll = event.target.checked;
		this.productGroups.forEach(p => {
			p.isSelected = this.selectAll;
			p.isSopDisabled = !p.isSelected;
		});
	}

	handleOnProductSelectedClick(event) {
		const product = this.productGroups.find(p =>
			p.uniqueId == event.target.dataset.uniqueId);
		product.isSelected = event.target.checked;
		product.isSopDisabled = !product.isSelected;
		this.selectAll = this.productGroups.every(p => p.isSelected);
	}
}