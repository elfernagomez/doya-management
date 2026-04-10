import { api, wire, track } from 'lwc';
import InputBase from 'c/inputBase';
import { refreshApex } from '@salesforce/apex';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getPackingSlipWithItems from '@salesforce/apex/PackingSlipManager.getPackingSlipWithItems';
import savePackingSlipItems from '@salesforce/apex/PackingSlipManager.savePackingSlipItems';
import { convertFromApexRecord } from 'c/orderProductManager';
import PACKING_SLIP_LAST_MODIFIED_FIELD from '@salesforce/schema/PackingSlip__c.LastModifiedDate';

function createPackingSlipWrapper(record) {
	return {
		uniqueId: record.Id,
		name: record.Name,
		orderId: record.Order__c,
		deliveryGroupId: record.DeliveryGroup__c,
		deliveryGroupName: record.DeliveryGroup__r ? record.DeliveryGroup__r.Name : null,
		notes: record.Notes__c,
		trackingNumber: record.TrackingNumber__c
	};
}

function createPackingSlipItemWrapper(record) {
	return {
		uniqueId: record.Id,
		name: record.Name,
		orderProductId: record.OrderProduct__c,
		productId: record.Product__c,
		qty: record.Quantity__c,
		notes: record.Notes__c
	};
}

function createNewItem() {
	return {
		uniqueId: `new-${Date.now()}`,
		name: '',
		orderProductId: null,
		productId: null,
		qty: 1,
		notes: '',
		isNew: true
	};
}

export default class PackingSlipItemEditor extends InputBase {
	@api recordId;

	@track packingSlip = {};
	@track items = [];
	@track products = [];
	@track isLoading = false;
	@track error;

	@api viewCustomActions = [];
	@api editCustomActions = [];

	wiredResult;
	lastSeenPackingSlipLastModifiedDate;
	isRefreshingFromRecordSignal = false;
	hasForcedInitialRefresh = false;

	connectedCallback() {
		this.hasForcedInitialRefresh = false;
	}

	get availableProducts() {
		return this.products.filter(product => {
			const existsInPackedItems = this.items.some(item =>
				item.orderProductId === product.uniqueId);
			return !existsInPackedItems && (Number(product.remainingQty) || 0) > 0;
		});
	}

	get showContent() {
		return true; // !this.isLoading && !this.error && this.packingSlip.uniqueId;
	}

	get itemCount() {
		return this.items?.length || 0;
	}

	get isSaveDisabled() {
		if (this.isLoading)
			return true;

		const inputs = this.template?.querySelectorAll('lightning-input');
		if (!inputs || !inputs.length)
			return !this.hasPendingChanges;

		const hasInvalidInputs = Array.from(inputs).some(input => !input.checkValidity());
		if (hasInvalidInputs)
			return true;

		return !this.hasPendingChanges;
	}

	get hasPendingChanges() {
		const hasItemsToDelete = this.items.some(item => !item.isNew && item.isSelected === false);
		if (hasItemsToDelete)
			return true;

		const hasChangedItemsToSave = this.items.some(item => item.isSelected !== false && item.isChanged);
		if (hasChangedItemsToSave)
			return true;

		return this.products.some(product => product.isSelected && product.remainingQty > 0);
	}

	@wire(getRecord, {
		recordId: '$recordId',
		fields: [PACKING_SLIP_LAST_MODIFIED_FIELD]
	})
	wiredPackingSlipChangeSignal(result) {
		if (!result || !result.data)
			return;

		const lastModifiedDate = getFieldValue(result.data, PACKING_SLIP_LAST_MODIFIED_FIELD);
		if (!lastModifiedDate)
			return;

		if (!this.lastSeenPackingSlipLastModifiedDate) {
			this.lastSeenPackingSlipLastModifiedDate = lastModifiedDate;
			return;
		}

		if (lastModifiedDate !== this.lastSeenPackingSlipLastModifiedDate) {
			this.lastSeenPackingSlipLastModifiedDate = lastModifiedDate;
			this.refreshFromRecordSignal();
		}
	}

	async refreshFromRecordSignal() {
		if (!this.wiredResult || this.isLoading || this.isRefreshingFromRecordSignal)
			return;

		this.isRefreshingFromRecordSignal = true;
		try {
			await refreshApex(this.wiredResult);
		} finally {
			this.isRefreshingFromRecordSignal = false;
		}
	}

	@wire(getPackingSlipWithItems, { packingSlipId: '$recordId' })
	wiredPackingSlip(result) {
		this.wiredResult = result;
		this.isLoading = true;

		if (result.data) {
			const { packingSlip, orderProducts } = result.data;
			const packedQtyByOrderProductId = result.data.packedQtyByOrderProductId || {};

			this.packingSlip = createPackingSlipWrapper(packingSlip);
			this.items = packingSlip.PackingSlipItems__r?.map(item => ({
				...createPackingSlipItemWrapper(item),
				isSelected: true,
				isQuantityDisabled: false,
				maxQty: 1,
				product: convertFromApexRecord(item.OrderProduct__r)
			})) || [];

			this.products = orderProducts.map(op => {
				const product = convertFromApexRecord(op);
				const packedInOtherSlipsQty = Number(packedQtyByOrderProductId[product.uniqueId]) || 0;
				return {
					...product,
					orderQty: Number(product.qty) || 0,
					packedInOtherSlipsQty,
					selectedQty: 1,
					remainingQty: 0,
					isSelectionDisabled: false,
					isSelected: false
				};
			});

			this.recalculateQuantities(true);
			this.error = undefined;
			this.isLoading = false;
		} else if (result.error) {
			this.error = (result.error.body && result.error.body.message) || 'Failed to load packing slip';
			this.packingSlip = {};
			this.items = [];
			this.products = [];
			this.isLoading = false;
			this.showToast('Error', this.error, 'error');
		}
	}

	handleOnPackingSlipCustomActionClick(event) {
		this.customEvent('packingslipcustomactionclick', {
			...event.detail,
			recordId: (event.detail && event.detail.recordId) || this.recordId
		});
	}

	handleItemSelect(event) {
		const itemId = event.currentTarget.dataset.uniqueId;
		const item = this.items.find(i => i.uniqueId === itemId);
		if (!item)
			return;

		item.isSelected = event.target.checked;
		item.isChanged = true;
		this.items = [...this.items];
		this.recalculateQuantities();
	}

	handleProductSelect(event) {
		const productId = event.currentTarget.dataset.uniqueId;
		const product = this.products.find(p => p.uniqueId === productId);
		if (!product)
			return;

		if (product.isSelectionDisabled) {
			product.isSelected = false;
			this.products = [...this.products];
			return;
		}

		product.isSelected = event.target.checked;
		if (product.isSelected && product.selectedQty > product.remainingQty)
			product.selectedQty = product.remainingQty || 1;

		this.products = [...this.products];
		this.recalculateQuantities();
	}

	handleProductChange(event) {
		const itemId = event.currentTarget.dataset.uniqueId;
		const item = this.items.find(i => i.uniqueId === itemId);
		if (!item)
			return;

		item.orderProductId = event.detail.value;
		item.isChanged = true;
		this.items = [...this.items];
		this.recalculateQuantities();
	}

	handleItemQuantityChange(event) {
		const itemId = event.currentTarget.dataset.uniqueId;
		const item = this.items.find(i => i.uniqueId === itemId);
		if (!item)
			return;

		const requestedQty = Math.max(1, parseInt(event.target.value, 10) || 1);
		const maxQty = Number(item.maxQty) || 1;
		if (requestedQty > maxQty) {
			item.qty = maxQty;
		} else {
			item.qty = requestedQty;
		}

		item.isChanged = true;
		this.items = [...this.items];
		this.recalculateQuantities();
	}

	handleProductQuantityChange(event) {
		const productId = event.currentTarget.dataset.uniqueId;
		const product = this.products.find(p => p.uniqueId === productId);
		if (!product)
			return;

		const requestedQty = Math.max(1, parseInt(event.target.value, 10) || 1);
		const maxQty = Number(product.remainingQty) || 0;
		if (requestedQty > maxQty && maxQty > 0) {
			product.selectedQty = maxQty;
		} else {
			product.selectedQty = requestedQty;
		}

		product.isChanged = true;
		this.products = [...this.products];
		this.recalculateQuantities();
	}

	handleNotesChange(event) {
		const itemId = event.currentTarget.dataset.itemId;
		const item = this.items.find(i => i.uniqueId === itemId);
		if (!item)
			return;

		item.notes = event.target.value;
		item.isChanged = true;
		this.items = [...this.items];
	}

	handleDeleteItem(event) {
		const itemId = event.currentTarget.dataset.itemId;
		this.items = this.items.filter(i => i.uniqueId !== itemId);
		this.recalculateQuantities();
	}

	handleAddItem() {
		this.items = [...this.items, createNewItem()];
		this.recalculateQuantities();
	}

	handleSave() {
		const inputs = Array.from(this.template.querySelectorAll('lightning-input'));
		const hasInvalidInput = inputs.some(input => {
			input.reportValidity();
			return !input.checkValidity();
		});

		if (hasInvalidInput)
			return;

		this.isLoading = true;

		const packingSlipItemIdsToDelete = this.items
			.filter(item => !item.isNew && item.isSelected === false)
			.map(item => item.uniqueId);

		const itemsToSave = this.items
			.filter(item => item.isSelected !== false && item.isChanged)
			.map(item => ({
				Id: item.isNew ? null : item.uniqueId,
				Quantity__c: item.qty
			}));

		this.products
			.filter(product => product.isSelected && product.remainingQty > 0)
			.forEach(product => {
				itemsToSave.push({
					PackingSlip__c: this.recordId,
					OrderProduct__c: product.uniqueId,
					Quantity__c: product.selectedQty || 1
				});
			});

		savePackingSlipItems({
			packingSlipItems: itemsToSave,
			packingSlipItemIdsToDelete
		})
			.then(() => {
				this.showToast('Success', 'Packing slip items saved', 'success');
				if (this.wiredResult)
					return refreshApex(this.wiredResult);
				return null;
			})
			.catch(error => {
				this.showToast('Error', (error.body && error.body.message) || 'Failed to save items', 'error');
			})
			.finally(() => {
				this.isLoading = false;
			});
	}

	recalculateQuantities(forRefresh = false) {
		const selectedQtyByProductId = {};

		this.items
			.filter(item => item.isSelected !== false)
			.forEach(item => {
				const productId = item.orderProductId;
				if (!productId)
					return;

				selectedQtyByProductId[productId] =
					(selectedQtyByProductId[productId] || 0) + (Number(item.qty) || 0);
			});

		this.items = this.items.map(item => {
			const product = this.products.find(p => p.uniqueId === item.orderProductId);
			const totalQty = Number(product ? product.orderQty : 0) || 0;
			const packedInOtherSlipsQty = Number(product ? product.packedInOtherSlipsQty : 0) || 0;
			const currentQty = item.isSelected !== false ? (Number(item.qty) || 0) : 0;
			const selectedOtherQty = (selectedQtyByProductId[item.orderProductId] || 0) - currentQty;
			const rawMaxQty = Math.max(0, totalQty - packedInOtherSlipsQty - selectedOtherQty);

			return {
				...item,
				maxQty: Math.max(1, rawMaxQty),
				isQuantityDisabled: item.isSelected === false || rawMaxQty <= 0
			};
		});

		this.products = this.products.map(product => {
			const totalQty = Number(product.orderQty) || 0;
			const packedInOtherSlipsQty = Number(product.packedInOtherSlipsQty) || 0;
			const usedQty = Number(selectedQtyByProductId[product.uniqueId]) || 0;
			const remainingQty = Math.max(0, totalQty - packedInOtherSlipsQty - usedQty);
			const isSelectionDisabled = remainingQty <= 0;
			const isSelected = isSelectionDisabled ? false : product.isSelected;
			var selectedQty;

			if (forRefresh) {
				selectedQty = remainingQty;
			} else {
				const currentSelectedQty = Number(product.selectedQty) || 1;
				selectedQty = Math.max(1, currentSelectedQty);
				// Preserve manual selectedQty unless it exceeds current availability.
				if (remainingQty > 0 && selectedQty > remainingQty) {
					selectedQty = remainingQty;
				}
			}

			return {
				...product,
				remainingQty,
				isSelectionDisabled,
				isSelected,
				isQuantityDisabled: !isSelected || isSelectionDisabled,
				selectedQty
			};
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