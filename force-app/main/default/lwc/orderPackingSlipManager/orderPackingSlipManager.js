import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { convertFromApexRecord } from 'c/orderProductManager';


import getPackingSlipsForOrder
	from '@salesforce/apex/PackingSlipManager.getPackingSlipsForOrder';
import getOrderProductsForOrder
	from '@salesforce/apex/PackingSlipManager.getOrderProductsForOrder';

/**
 * Creates a packing slip wrapper from Apex record
 * @param {Object} record - Apex PackingSlip__c record
 * @returns {Object} Packing slip wrapper
 */
function createPackingSlipWrapper(record) {
	return {
		id: record.Id,
		name: record.Name,
		orderId: record.Order__c,
		deliveryGroupId: record.DeliveryGroup__c,
		deliveryGroupName: record.DeliveryGroup__r?.Name,
		description: record.Description__c,
		trackingNumber: record.TrackingNumber__c,
		itemCount: record.PackingSlipItems__r?.length || 0,
		items: record.PackingSlipItems__r?.map(item => createPackingSlipItemWrapper(item)) || []
	};
}

/**
 * Creates a packing slip item wrapper from Apex record
 * @param {Object} record - Apex PackingSlipItem__c record
 * @returns {Object} Packing slip item wrapper
 */
function createPackingSlipItemWrapper(record) {
	return {
		id: record.Id,
		name: record.Name,
		productId: record.Product__c,
		quantity: record.Quantity__c,
		orderProductId: record.OrderProduct__c
	};
}

export default class OrderPackingSlipManager extends LightningElement {
	@api recordId; // Order Id
	@track packingSlips = [];
	@track isLoading = true;
	@track error;
	@track showOrderProducts = true;
	@track orderProducts = [];

	orderProductColumns = [
		{ label: 'Item #', fieldName: 'OrderItemNumber', type: 'text' },
		{ label: 'Product', fieldName: 'ProductName', type: 'text' },
		{ label: 'Quantity', fieldName: 'Quantity', type: 'number' },
		{ label: 'Unit Price', fieldName: 'UnitPrice', type: 'currency' },
		{ label: 'Total', fieldName: 'TotalPrice', type: 'currency' }
	];

	// Wire to get Packing Slips for the Order
	@wire(getPackingSlipsForOrder, { orderId: '$recordId' })
	wiredPackingSlips({ error, data }) {
		this.isLoading = true;
		if (data) {
			this.packingSlips = data.map(record => createPackingSlipWrapper(record));
			this.error = undefined;
			this.isLoading = false;
		} else if (error) {
			this.error = error;
			this.packingSlips = [];
			this.isLoading = false;
			this.showToast('Error', 'Failed to load packing slips', 'error');
		}
	}

	// Wire to get Order Products
	@wire(getOrderProductsForOrder, { orderId: '$recordId' })
	wiredOrderProducts({ error, data }) {
		if (data) {
			this.orderProducts = data.map(
				record => convertFromApexRecord(record));
		} else if (error) {
			this.showToast('Error', 'Failed to load order products', 'error');
			this.orderProducts = [];
		}
	}

	get hasPackingSlips() {
		return this.packingSlips && this.packingSlips.length > 0;
	}

	handleToggleOrderProducts() {
		this.showOrderProducts = !this.showOrderProducts;
	}

	handleNewPackingSlip() {
		// Navigate to create new Packing Slip
		this.showToast('Info', 'Create new packing slip functionality', 'info');
	}

	handlePackingSlipEdit(event) {
		const recordId = event.detail.recordId;
		this.showToast('Success', 'Packing slip updated', 'success');
		// Refresh wire by resetting recordId
		return getPackingSlipsForOrder({ orderId: this.recordId })
			.then(data => {
				this.packingSlips = data.map(record => createPackingSlipWrapper(record));
			})
			.catch(error => {
				this.showToast('Error', 'Failed to refresh packing slips', 'error');
			});
	}

	handlePackingSlipDelete(event) {
		const recordId = event.detail.recordId;
		this.showToast('Success', 'Packing slip deleted', 'success');
		// Refresh wire by resetting recordId
		return getPackingSlipsForOrder({ orderId: this.recordId })
			.then(data => {
				this.packingSlips = data.map(record => createPackingSlipWrapper(record));
			})
			.catch(error => {
				this.showToast('Error', 'Failed to refresh packing slips', 'error');
			});
	}

	showToast(title, message, variant) {
		this.dispatchEvent(
			new ShowToastEvent({
				title,
				message,
				variant
			})
		);
	}
}
