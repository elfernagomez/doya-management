import { api, wire, track } from 'lwc';
import InputBase from 'c/inputBase';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import PACKING_SLIP_OBJECT from '@salesforce/schema/PackingSlip__c';
import ORDER_STATUS_FIELD from '@salesforce/schema/Order.Status';
import { refreshApex } from '@salesforce/apex';
import { subscribe, unsubscribe, onError } from 'lightning/empApi';
import LightningConfirm from 'lightning/confirm';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import labelDeletePackingSlipMessage from '@salesforce/label/c.OrderPackingSlipManager_deletePackingSlipMessage';
import PackingSlipItemEditorModal from 'c/packingSlipItemEditorModal';
import PackingSlipCreateModal from 'c/packingSlipCreateModal';
import { convertFromApexRecord } from 'c/orderProductManager';
import deletePackingSlip from '@salesforce/apex/PackingSlipManager.deletePackingSlip';

import getDeliveryGroupsByOrder
	from '@salesforce/apex/DeliveryGroupManager.getDeliveryGroupsByOrder';

import { createGroupFromApexRecord } from "c/deliveryGroupCard";

const PACKING_SLIP_CDC_CHANNEL = '/data/PackingSlip__ChangeEvent';

/**
 * Creates a packing slip wrapper from Apex record
 * @param {Object} record - Apex PackingSlip__c record
 * @returns {Object} Packing slip wrapper
 */
function createPackingSlipWrapper(record) {
	const itemCount = record.PackingSlipItems__r?.length || 0;
	return {
		uniqueId: record.Id,
		name: record.Name,
		orderId: record.Order__c,
		deliveryGroupId: record.DeliveryGroup__c,
		deliveryGroupName: record.DeliveryGroup__r?.Name,
		description: record.Description__c,
		trackingNumber: record.TrackingNumber__c,
		itemCount: itemCount,
		itemCountLabel: itemCount === 1 ? 'item' : 'items',
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
		uniqueId: record.Id,
		name: record.Name,
		productId: record.Product__c,
		quantity: record.Quantity__c,
		orderProductId: record.OrderProduct__c
	};
}

export default class OrderPackingSlipManager extends InputBase {
	@api recordId; // Order Id
	labelDeletePackingSlipMessage = labelDeletePackingSlipMessage;

	@track groups = [];
	@track isLoading = true;
	@track error;
	@track showOrderProducts = true;
	@track orderProducts = [];
	@track printPreviewUrl;

	wiredDeliveryGroupsResult;
	packingSlipSubscription;
	pendingPrintPackingSlipId;
	loadedPrintPackingSlipId;

	@wire(getObjectInfo, { objectApiName: PACKING_SLIP_OBJECT })
	packingSlipInfo;

	@wire(getRecord, { recordId: '$recordId', fields: [ORDER_STATUS_FIELD] })
	order;

	get packingSlipCrud() {
		const d = this.packingSlipInfo?.data;
		return {
			canRead: !!d?.queryable,
			canCreate: !!d?.createable,
			canUpdate: !!d?.updateable,
			canDelete: !!d?.deletable
		};
	}

	get isOrderActionable() {
		const status = getFieldValue(this.order?.data, ORDER_STATUS_FIELD);
		return status !== 'Delivered' &&
			status !== 'Invoiced' &&
			status !== 'Cancelled';
	}

	connectedCallback() {
		this.subscribeToPackingSlipCreateEvents();
		this.registerEmpApiErrorListener();
	}

	disconnectedCallback() {
		this.unsubscribeFromPackingSlipCreateEvents();
	}

	get deliveryGroupCardCustomActions() {
		const options = [];

		const canAddSlip = this.packingSlipCrud.canCreate && this.isOrderActionable;

		if ((this.isView || this.isEdit) && canAddSlip) {
			options.push({
				label: 'New Packing Slip',
				name: 'new',
				iconName: 'utility:add',
				variant: 'success'
			});
		}

		return options;
	}

	get packingSlipCardCustomActions() {
		const options = [];
		const canAddSlipItem = this.isOrderActionable && true;
		const canDeleteSlip = this.packingSlipCrud.canDelete && this.isOrderActionable;
		const canEditSlip = this.packingSlipCrud.canUpdate && this.isOrderActionable;

		if (this.isView) {
			options.push(...[
				{
					label: 'Print',
					name: 'print',
					iconName: 'utility:print',
					variant: 'neutral'
				}
			]);

			if (canDeleteSlip) {
				options.push({
					label: 'Delete',
					name: 'delete',
					iconName: 'utility:delete',
					variant: 'neutral',
					type: 'button-icon'
				});
			}
		}

		
		if (this.isEdit) {
			if (canEditSlip) {
				options.push({
						label: 'Edit',
						name: 'edit',
						iconName: 'utility:edit',
						variant: 'neutral'
				});
			}


			if (canAddSlipItem) {
				options.push({
					label: 'Add/Remove Items',
					name: 'items',
					iconName: 'utility:list',
					variant: 'neutral'
				});
			}

			if (canDeleteSlip) {
				options.push({
					label: 'Delete',
					name: 'delete',
					iconName: 'utility:delete',
					variant: 'neutral',
					type: 'button-icon'
				});
			}
		}

		return options;
	}

	// Wire to get Packing Slips for the Order
	@wire(getDeliveryGroupsByOrder, { orderId: '$recordId' })
	wiredDeliveryGroups(result) {
		this.wiredDeliveryGroupsResult = result;
		const { error, data } = result;
		this.isLoading = true;
		if (data) {
			this.groups = [
				...data.map(r => {
					const products = r.OrderProducts__r?.map(
							p => convertFromApexRecord(p)) || [];
					const slips = r.PackingSlips__r?.map(
							op => createPackingSlipWrapper(op)) || [];
					return {
						...createGroupFromApexRecord(r),
						products,
						slips
					};
				})
			];
			this.error = undefined;
			this.isLoading = false;
		} else if (error) {
			this.error = error;
			this.groups = [];
			this.isLoading = false;
			this.showToast('Error', 'Failed to load packing slips', 'error');
		}
	}

	registerEmpApiErrorListener() {
		onError(() => {
			// Intentionally swallowed: CDC is optional and should not break UI behavior.
		});
	}

	subscribeToPackingSlipCreateEvents() {
		if (this.packingSlipSubscription)
			return;

		subscribe(PACKING_SLIP_CDC_CHANNEL, -1, eventMessage => {
			this.handlePackingSlipChangeEvent(eventMessage);
		}).then(subscription => {
			this.packingSlipSubscription = subscription;
		});
	}

	unsubscribeFromPackingSlipCreateEvents() {
		if (!this.packingSlipSubscription)
			return;

		unsubscribe(this.packingSlipSubscription, () => {
			this.packingSlipSubscription = null;
		});
	}

	handlePackingSlipChangeEvent(eventMessage) {
		const payload = eventMessage?.data?.payload;
		const header = payload?.ChangeEventHeader;

		if (!payload || !header || header.changeType !== 'CREATE')
			return;

		if (payload.Order__c !== this.recordId)
			return;

		this.refreshDeliveryGroups();
	}

	refreshDeliveryGroups() {
		if (this.wiredDeliveryGroupsResult)
			refreshApex(this.wiredDeliveryGroupsResult);
	}

	get hasGroups() {
		return this.groups && this.groups.length > 0;
	}

	handleToggleOrderProducts() {
		this.showOrderProducts = !this.showOrderProducts;
	}

	handleOnGroupCustomActionClick(event) {
		const { actionKey, actionValue, actionName, action, recordId } = event.detail;
		const selectedAction = actionKey || actionValue || actionName || action?.value || action?.name;

		switch (selectedAction) {
			case 'new':
				this.handleNewPackingSlip(recordId);
				break;
			default:
				break;
		}
	}

	handleOnPackingSlipCustomActionClick(event) {
		const { actionKey, actionValue, actionName, action, recordId } = event.detail;
		const selectedAction = actionKey || actionValue || actionName || action?.value || action?.name;

		switch (selectedAction) {
			case 'edit':
				this.handlePackingSlipEdit(recordId);
				break;
			case 'delete':
				this.handlePackingSlipDelete(recordId);
				break;
			case 'items':
				if (recordId)
					this.openPackingSlipItemEditorModal(recordId);
				break;
			case 'print':
				this.handlePrintPackingSlip(recordId);
				break;
			default:
				break;
		}
	}

	openPackingSlipItemEditorModal(packingSlipId) {
		const modalParams = {
			size: 'medium',
			packingSlipId
		};

		return PackingSlipItemEditorModal.open(modalParams)
			.then((result) => {
				if (result === 'saved') {
					this.showToast('Success', 'Items saved successfully', 'success');
				}
			});
	}

	openPackingSlipCreateModal({
		deliveryGroupId = null,
		recordId = null,
		mode = 'create',
		defaultValues = {}
	} = {}) {
		const modalParams = {
			size: 'small',
			recordId,
			mode,
			orderId: this.recordId,
			deliveryGroupId,
			defaultValues
		};

		return PackingSlipCreateModal.open(modalParams)
			.then((result) => {
				if (result?.status === 'saved') {
					this.showToast('Success', 'Packing slip created successfully', 'success');
					this.refreshDeliveryGroups();
					this.handleOnEditClick();
				}
			});
	}

	handleEditItemsClick(event) {
		const packingSlipId = event.target.dataset.packingSlipId;
		this.openPackingSlipItemEditorModal(packingSlipId);
	}

	handleNewPackingSlip(deliveryGroupId) {
		this.openPackingSlipCreateModal({
			deliveryGroupId,
			mode: 'create',
			defaultValues: {
				Order__c: this.recordId,
				DeliveryGroup__c: deliveryGroupId
			}
		});
	}

	handlePackingSlipEdit(packingSlipId) {
		this.openPackingSlipCreateModal({
			recordId: packingSlipId,
			mode: 'edit'
		});
		// Refresh wire by resetting recordId
		/* return getDeliveryGroupsByOrder({ orderId: this.recordId })
			.then(data => {
				this.groups = data.map(record => createPackingSlipWrapper(record));
			})
			.catch(error => {
				console.error(error);
				this.showToast('Error', 'Failed to refresh packing slips', 'error');
			}); */
	}

	handlePackingSlipDelete(recordIdOrEvent) {
		const recordId = typeof recordIdOrEvent === 'string' ?
			recordIdOrEvent :
			recordIdOrEvent?.detail?.recordId;

		if (!recordId)
			return;

		LightningConfirm.open({
			message: this.labelDeletePackingSlipMessage,
			variant: 'header',
			label: 'Delete Packing Slip'
		})
		.then(result => {
			if (!result)
				return null;

			return deletePackingSlip({ packingSlipId: recordId })
				.then(() => {
					this.showToast('Success', 'Packing slip deleted', 'success');
					this.refreshDeliveryGroups();
				})
				.catch(error => {
					this.showToast(
						'Error',
						error?.body?.message || 'Failed to delete packing slip',
						'error');
				});
		});
	}

		handlePrintPackingSlip(recordId) {
			if (!recordId)
				return;

			if (this.loadedPrintPackingSlipId === recordId && this.postPrintMessageToFrame())
				return;

			this.pendingPrintPackingSlipId = recordId;
			this.printPreviewUrl = this.buildPrintPreviewUrl(recordId);
		}

		handlePrintPreviewLoad() {
			if (!this.pendingPrintPackingSlipId)
				return;

			this.loadedPrintPackingSlipId = this.pendingPrintPackingSlipId;
			this.pendingPrintPackingSlipId = null;
			if (!this.postPrintMessageToFrame()) {
				this.showToast('Error', 'Failed to print the packing slip preview', 'error');
			}
		}

		buildPrintPreviewUrl(recordId) {
			return `/apex/PackingSlipPreview?mode=preview&recordId=${encodeURIComponent(recordId)}`;
		}

		postPrintMessageToFrame() {
			const previewFrame = this.refs?.printPreviewFrame;
			const previewWindow = previewFrame?.contentWindow;
			if (!previewWindow)
				return false;

			previewWindow.postMessage({ type: 'packing-slip-print' }, '*');
			return true;
		}

	handleOnSearchSlipsChange(event) {
		this.searchSlipsTerm = event.target.value;
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
