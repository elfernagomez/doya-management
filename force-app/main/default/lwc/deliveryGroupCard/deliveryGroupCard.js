import InputBase from 'c/inputBase';
import { api, wire } from 'lwc';
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import cloneGroup from "@salesforce/apex/DeliveryGroupManager.clone";
import CustomConfirm from 'c/customConfirm';
import DeliveryGroupDetailsModal from 'c/deliveryGroupDetailsModal';

import NAME_FIELD
	from "@salesforce/schema/DeliveryGroup__c.Name";
import CREATED_DATE_FIELD
	from "@salesforce/schema/DeliveryGroup__c.CreatedDate";
import DUE_DATE_FIELD
	from "@salesforce/schema/DeliveryGroup__c.DueDate__c";
import DELIVERY_TYPE_FIELD
	from "@salesforce/schema/DeliveryGroup__c.DeliveryType__c";
import LOCATION_TYPE_FIELD
	from "@salesforce/schema/DeliveryGroup__c.DeliveryLocationType__c";
import PICKUP_LOCATION_TYPE_FIELD
	from "@salesforce/schema/DeliveryGroup__c.PickupLocationType__c";
import NOTES_FIELD
	from "@salesforce/schema/DeliveryGroup__c.Notes__c";
import DELIVERY_CENTER_ID_FIELD
	from "@salesforce/schema/DeliveryGroup__c.DeliveryCenter__c";
import DELIVERY_CENTER_NAME_FIELD
	from "@salesforce/schema/DeliveryGroup__c.DeliveryCenter__r.Name";
import PICKUP_CENTER_ID_FIELD
	from "@salesforce/schema/DeliveryGroup__c.PickupCenter__c";
import PICKUP_CENTER_NAME_FIELD
	from "@salesforce/schema/DeliveryGroup__c.PickupCenter__r.Name";
import ADDRESS_LABEL_FIELD
	from "@salesforce/schema/DeliveryGroup__c.AddressLabel__c";
import DELIVERY_ADDRESS_HTML_FIELD
	from "@salesforce/schema/DeliveryGroup__c.DeliveryAddressHtml__c";
import PICKUP_ADDRESS_HTML_FIELD
	from "@salesforce/schema/DeliveryGroup__c.PickupAddressHtml__c";

export const DEFAULT_GROUP_NAME = "Group";

export function createNewDelvieryGroup() {
	return {
		uniqueId: "unsaved_0",
		name: DEFAULT_GROUP_NAME,
		createdDate: null,
		dueDate: null,
		deliveryType: "Delivery",
		locationType: "DeliveryCenter",
		pickupLocationType: "Pickup Center",
		deliveryCenterId: null,
		deliveryCenterName: null,
		pickupCenterId: null,
		pickupCenterName: null,
		addressLabel: null,
		deliveryAddressHtml: null,
		pickupAddressHtml: null,
		isNew: true,
		isPlaceHolder: false,
		products: []
	};
}

export function createGroupFromRecord(record) {
	let deliveryCenterId = getFieldValue(record, DELIVERY_CENTER_ID_FIELD);
	return {
		...createNewDelvieryGroup(),
		uniqueId: record.id,
		name: getFieldValue(record, NAME_FIELD),
		createdDate: getFieldValue(record, CREATED_DATE_FIELD),
		dueDate: getFieldValue(record, DUE_DATE_FIELD),
		deliveryType: getFieldValue(record, DELIVERY_TYPE_FIELD) || "Delivery",
		locationType: getFieldValue(record, LOCATION_TYPE_FIELD) || "Delivery Center",
		pickupLocationType: getFieldValue(record, PICKUP_LOCATION_TYPE_FIELD) || "Pickup Center",
		deliveryCenterId,
		deliveryCenterName: getFieldValue(record, DELIVERY_CENTER_NAME_FIELD),
		pickupCenterId: getFieldValue(record, PICKUP_CENTER_ID_FIELD),
		pickupCenterName: getFieldValue(record, PICKUP_CENTER_NAME_FIELD),
		addressLabel: getFieldValue(record, ADDRESS_LABEL_FIELD),
		deliveryAddressHtml: getFieldValue(record, DELIVERY_ADDRESS_HTML_FIELD),
		pickupAddressHtml: getFieldValue(record, PICKUP_ADDRESS_HTML_FIELD),
		notes: getFieldValue(record, NOTES_FIELD),
		isNew: false,
		isPlaceHolder: false,
		products: []
	};
}

export function createGroupFromApexRecord(record) {
	return {
		...createNewDelvieryGroup(),
		uniqueId: record.Id,
		name: record.Name,
		createdDate: record.CreatedDate,
		dueDate: record.DueDate__c,
		deliveryType: record.DeliveryType__c || "Delivery",
		locationType: record.DeliveryLocationType__c || "Delivery Center",
		pickupLocationType: record.PickupLocationType__c || "Pickup Center",
		deliveryCenterId: record.DeliveryCenter__c,
		deliveryCenterName: record.DeliveryCenter__r?.Name,
		pickupCenterId: record.PickupCenter__c,
		pickupCenterName: record.PickupCenter__r?.Name,
		addressLabel: record.AddressLabel__c,
		deliveryAddressHtml: record.DeliveryAddressHtml__c,
		pickupAddressHtml: record.PickupAddressHtml__c,
		isNew: false,
		isPlaceHolder: false,
		products: []
	};
}

export function createGroupRecord(deliveryGroup) {
	let record = {
		DeliveryCenter__c: deliveryGroup.deliveryCenterId,
		PickupCenter__c: deliveryGroup.pickupCenterId,
		Name: deliveryGroup.name,
		DeliveryType__c: deliveryGroup.deliveryType,
		DueDate__c: deliveryGroup.dueDate
	};

	/* if (deliveryGroup.deliveryCenterId) {
		record.DeliveryAddress__Street__s = null;
		record.DeliveryAddress__City__s = null;
		record.DeliveryAddress__StateCode__s = null;
		record.DeliveryAddress__PostalCode__s = null;
		record.DeliveryAddress__CountryCode__s = null;
	} else {
		record.DeliveryAddress__Street__s = deliveryGroup.address?.street;
		record.DeliveryAddress__City__s = deliveryGroup.address?.city;
		record.DeliveryAddress__StateCode__s = deliveryGroup.address?.stateCode;
		record.DeliveryAddress__PostalCode__s = deliveryGroup.address?.postalCode;
		record.DeliveryAddress__CountryCode__s = deliveryGroup.address?.countryCode;
	} */

	if (!deliveryGroup.isNew) {
		record.Id = deliveryGroup.uniqueId;
	}

	return record;
}

export default class DeliveryGroupCard extends InputBase {
	@api
	recordId;

	@api
	productCount;

	@api
	customActions = [];

	@api
	hideDetailsButton = false;

	@api
	allowDeleteOnView = false;

	@api
	get deliveryGroup() {
		return this.group;
	}

	set deliveryGroup(value) {
		this.group = {...value};
	}

	group = {};

	isLoading = false;
	clonedGroupName;

	get showCloneButton() {
		return !this.group.isPlaceHolder && this.isEdit;
	}

	get showDetailsButton() {
		return !this.group.isPlaceHolder && !this.hideDetailsButton;
	}

	get showDeleteButton() {
		return (this.isEdit || this.allowDeleteOnView) && !this.group.isPlaceHolder;
	}

	get headerIconName() {
		switch (this.group.deliveryType) {
			case "Pick Up":
				return "standard:home";
			case "Delivery":
			case "Installation":
			case "FedEx":
			case "UPS":
			case "Courier":
			case "Uber":
			case "DHL":
				return this.showDeliveryCenter ?
					"standard:account" :
					"standard:address";
			default:
				return "standard:group_loading";
		}
	}

	get showDeliveryCenter() {
		return (this.group.locationType || "Delivery Center") == "Delivery Center";
	}

	get dueDateDisplayValue() {
		const dueDate = this.group?.dueDate;
		if (!dueDate)
			return null;

		// Salesforce Date values can shift a day when treated as UTC midnight.
		// Use local noon for date-only strings to keep the expected calendar date.
		if (typeof dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dueDate))
			return new Date(`${dueDate}T12:00:00`);

		return dueDate;
	}

	get isSaveButtonDisabled() {
		return this.isLoading;
	}

	get isCancelButtonDisabled() {
		return this.isLoading;
	}

	get isDeleteButtonDisabled() {
		return false;
	}

	@wire(getRecord, { 
		recordId: "$recordId",
		fields: [
			NAME_FIELD,
			CREATED_DATE_FIELD,
			DUE_DATE_FIELD,
			DELIVERY_TYPE_FIELD,
			LOCATION_TYPE_FIELD,
			PICKUP_LOCATION_TYPE_FIELD,
			NOTES_FIELD,
			DELIVERY_CENTER_ID_FIELD,
			DELIVERY_CENTER_NAME_FIELD,
			PICKUP_CENTER_ID_FIELD,
			PICKUP_CENTER_NAME_FIELD,
			ADDRESS_LABEL_FIELD,
			DELIVERY_ADDRESS_HTML_FIELD,
			PICKUP_ADDRESS_HTML_FIELD
		]
	})
	wiredDeliveryGroup({ data, error }) {
		if (data) {
			this.group = createGroupFromRecord(data);
		} else if (error) {
			this.addError(
				`There was an issue while retrieving the group (${this.recordId})`,
				error);
		}
	}

	async handleOnOpenDetailsClick() {
		const result = await DeliveryGroupDetailsModal.open({
			size: 'small',
			recordId: this.recordId,
			group: this.group,
			isEdit: this.isEdit,
			isView: this.isView
		});

		if (result === 'saved') {
			this.customEvent("groupedit", {
				recordId: this.recordId
			});
		}

		if (result === 'cancel') {
			this.removeError();
		}
	}

	handleOnCloneFieldChange(event) {
		this.clonedGroupName = event.target.value;
		/*
		switch (event.target.dataset.fieldName) {
			case "Name":
				this.deliveryCenterId = event.target.value;
				break;
			default:
				break;
		} */
	}

	handleOnCustomActionClick(event) {
		const actionIndex = Number(event.currentTarget.dataset.actionIndex);
		const actionValue = event.currentTarget.dataset.actionValue;
		const actionName = event.currentTarget.dataset.actionName;
		const action = Number.isInteger(actionIndex) ?
			this.customActions[actionIndex] :
			this.customActions.find(a =>
				a.value === actionValue || a.name === actionName);
		const actionKey = action?.value || action?.name || actionValue || actionName;

		this.customEvent("customactionclick", {
			recordId: this.group.uniqueId,
			actionIndex,
			actionValue,
			actionName,
			actionKey,
			action
		});
	}

	handleOnStartDeleteClick() {
		CustomConfirm.open({
			content: [
				`<p style="text-align:center;">`,
				"Are you sure you want to delete this Delivery Group?<br/>",
				"All products in this group will be removed from the order.",
				`</p>`
			].join("\n"),
			title: "Delete Delivery Group",
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
				this.customEvent("groupdelete", {
					recordId: this.group.uniqueId
				});
		});
	}

	handleOnCloneRequestClick() {
		this.clonedGroupName = `${this.group.name} [NEW]`;
		this.getComponent(".cloneModal").open();
	}

	handleOnCancelCloneClick() {
		this.removeError();
		this.getComponent(".cloneModal").close();
	}

	handleOnCloneSubmit() {
		if (this.validateInputs(".cloneField"))
			this.clone();
	}

	clone() {
		this.isLoading = true;
		cloneGroup({
			deliveryGroupId: this.recordId,
			newName: this.clonedGroupName
		})
		.then(clonedDeliveryGroupId => {
			this.isLoading = false;
			this.handleOnCancelCloneClick();
			this.customEvent("groupclone", {
				recordId: clonedDeliveryGroupId
			});
		})
		.catch(error => {
			this.isLoading = false;
			this.addError(
				error.body?.message || "There was an issue while cloning.",
				error);
		});
	}
}