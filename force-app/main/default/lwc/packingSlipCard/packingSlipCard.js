import InputBase from 'c/inputBase';
import { api, wire } from 'lwc';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { NavigationMixin } from 'lightning/navigation';
import CustomConfirm from 'c/customConfirm';

import PACKING_SLIP_OBJECT from '@salesforce/schema/PackingSlip__c';
import NAME_FIELD
	from "@salesforce/schema/PackingSlip__c.Name";
import ORDER_FIELD
	from "@salesforce/schema/PackingSlip__c.Order__c";
import DELIVERY_GROUP_FIELD
	from "@salesforce/schema/PackingSlip__c.DeliveryGroup__c";
import DESCRIPTION_FIELD
	from "@salesforce/schema/PackingSlip__c.Description__c";
import TRACKING_NUMBER_FIELD
	from "@salesforce/schema/PackingSlip__c.TrackingNumber__c";

export const DEFAULT_PACKING_SLIP_NAME = "Packing Slip";

export function createNewPackingSlip() {
	return {
		uniqueId: "unsaved_0",
		name: DEFAULT_PACKING_SLIP_NAME,
		orderId: null,
		deliveryGroupId: null,
		deliveryGroupName: null,
		description: null,
		trackingNumber: null,
		isNew: true,
		items: []
	};
}

export function createPackingSlipFromRecord(record) {
	return {
		...createNewPackingSlip(),
		uniqueId: record.id,
		name: getFieldValue(record, NAME_FIELD),
		orderId: getFieldValue(record, ORDER_FIELD),
		deliveryGroupId: getFieldValue(record, DELIVERY_GROUP_FIELD),
		description: getFieldValue(record, DESCRIPTION_FIELD),
		trackingNumber: getFieldValue(record, TRACKING_NUMBER_FIELD),
		isNew: false,
		items: []
	};
}

export function createPackingSlipFromApexRecord(record) {
	return {
		...createNewPackingSlip(),
		uniqueId: record.Id,
		name: record.Name,
		orderId: record.Order__c,
		deliveryGroupId: record.DeliveryGroup__c,
		deliveryGroupName: record.DeliveryGroup__r?.Name,
		description: record.Description__c,
		trackingNumber: record.TrackingNumber__c,
		isNew: false,
		items: []
	};
}

export function createPackingSlipRecord(packingSlip) {
	let record = {
		Name: packingSlip.name,
		Order__c: packingSlip.orderId,
		DeliveryGroup__c: packingSlip.deliveryGroupId,
		Description__c: packingSlip.description,
		TrackingNumber__c: packingSlip.trackingNumber
	};

	if (!packingSlip.isNew)
		record.Id = packingSlip.uniqueId;

	return record;
}

export default class PackingSlipCard extends NavigationMixin(InputBase) {
	@api
	recordId;

	@api
	itemCount;

	@api
	get packingSlip() {
		return this._packingSlip;
	}

	set packingSlip(value) {
		this._packingSlip = {...value};
	}

	_packingSlip = {};
	objectInfo;

	get showDeleteButton() {
		return true;
	}

	get headerIconName() {
		// const iconValue = this.objectInfo?.themeInfo?.iconUrl || 'standard:shipment';
		const iconValue = 'custom:custom13';
		return iconValue;
	}

	get isIconUrl() {
		const iconValue = this.headerIconName;
		return iconValue && (iconValue.startsWith('http') ||
			iconValue.startsWith('/'));
	}

	@wire(getObjectInfo, { objectApiName: PACKING_SLIP_OBJECT })
	wiredObjectInfo({ data }) {
		if (data) {
			this.objectInfo = data;
		}
	}

	@wire(getRecord, { 
		recordId: "$recordId",
		fields: [
			NAME_FIELD,
			ORDER_FIELD,
			DELIVERY_GROUP_FIELD,
			DESCRIPTION_FIELD,
			TRACKING_NUMBER_FIELD
		]
	})
	wiredPackingSlip({ data, error }) {
		if (data) {
			this._packingSlip = createPackingSlipFromRecord(data);
		} else if (error) {
			this.addError(
				`There was an issue while retrieving the packing slip (${this.recordId})`,
				error);
		}
	}

	handleOnNavigateToRecord(event) {
		event.preventDefault();
		this[NavigationMixin.Navigate]({
			type: 'standard__recordPage',
			attributes: {
				recordId: this.recordId,
				objectApiName: 'PackingSlip__c',
				actionName: 'view'
			}
		});
	}

	handleOnStartDeleteClick() {
		CustomConfirm.open({
			content: [
				`<p style="text-align:center;">`,
				"Are you sure you want to delete this Packing Slip?<br/>",
				"All items in this packing slip will be removed.",
				`</p>`
			].join("\n"),
			title: "Delete Packing Slip",
			size: "small",
			buttons: [{
				name: "cancel",
				label: "Cancel",
				variant: ""
			}, {
				name: "delete",
				label: "Delete",
				variant: "destructive"
			}]
		}).then(result => {
			if (result?.name == "delete")
				this.customEvent("packingslipdelete", {
					recordId: this.recordId
				});
		});
	}
}
