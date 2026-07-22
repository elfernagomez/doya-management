import LightningModal from 'lightning/modal';
import { api, wire } from 'lwc';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';

import ACCOUNT_NAME_FIELD
	from '@salesforce/schema/Account.Name';
import ACCOUNT_SHIPPING_STREET_FIELD
	from '@salesforce/schema/Account.ShippingStreet';
import ACCOUNT_SHIPPING_CITY_FIELD
	from '@salesforce/schema/Account.ShippingCity';
import ACCOUNT_SHIPPING_STATE_FIELD
	from '@salesforce/schema/Account.ShippingState';
import ACCOUNT_SHIPPING_POSTAL_CODE_FIELD
	from '@salesforce/schema/Account.ShippingPostalCode';
import ACCOUNT_SHIPPING_COUNTRY
	from '@salesforce/schema/Account.ShippingCountry';

export default class DeliveryGroupDetailsModal extends LightningModal {
	@api
	recordId;

	_isEdit = false;
	_isView = false;

	@api
	get isEdit() {
		return this._isEdit;
	}

	set isEdit(value) {
		this._isEdit = Boolean(value);
	}

	@api
	get isView() {
		return this._isView;
	}

	set isView(value) {
		this._isView = Boolean(value);
	}

	_group = {};

	@api
	get group() {
		return this._group;
	}

	set group(value) {
		this._group = value || {};
	}

	isError = false;
	errorTitle;
	errorObject;
	isLoading = false;
	deliveryCenterId;
	deliveryCenterAddress;
	pickupCenterId;
	pickupCenterAddress;
	locationTypeChoice = 'Delivery Center';
	pickupLocationTypeChoice = 'Pickup Center';

	connectedCallback() {
		this.locationTypeChoice = this.group?.locationType || 'Delivery Center';
		this.pickupLocationTypeChoice = this.group?.pickupLocationType || 'Pickup Center';
		this.deliveryCenterId = this.group?.deliveryCenterId;
		this.pickupCenterId = this.group?.pickupCenterId;

		if (!this.deliveryCenterId)
			this.deliveryCenterAddress = null;

		if (!this.pickupCenterId)
			this.pickupCenterAddress = null;
	}

	addError(errorTitle, errorObject) {
		this.errorTitle = errorTitle;
		this.errorObject = errorObject;
		this.isError = true;
	}

	removeError() {
		this.errorTitle = null;
		this.errorObject = null;
		this.isError = false;
	}

	get locationTypeOptions() {
		return [{
			label: 'Delivery Center',
			value: 'Delivery Center'
		}, {
			label: 'Address',
			value: 'Address'
		}];
	}

	get pickupLocationTypeOptions() {
		return [{
			label: 'Pickup Center',
			value: 'Pickup Center'
		}, {
			label: 'Address',
			value: 'Address'
		}];
	}

	get showDeliveryCenter() {
		return this.locationTypeChoice == 'Delivery Center';
	}

	get showDeliveryAddress() {
		return this.locationTypeChoice == 'Address';
	}

	get showPickupCenter() {
		return this.pickupLocationTypeChoice == 'Pickup Center';
	}

	get showPickupAddress() {
		return this.pickupLocationTypeChoice == 'Address';
	}

	get isSaveButtonDisabled() {
		return this.isLoading;
	}

	get isCancelButtonDisabled() {
		return this.isLoading;
	}

	@wire(getRecord, {
		recordId: '$pickupCenterId',
		fields: [
			ACCOUNT_NAME_FIELD,
			ACCOUNT_SHIPPING_STREET_FIELD,
			ACCOUNT_SHIPPING_CITY_FIELD,
			ACCOUNT_SHIPPING_STATE_FIELD,
			ACCOUNT_SHIPPING_POSTAL_CODE_FIELD,
			ACCOUNT_SHIPPING_COUNTRY
		]
	})
	wiredPickupCenterAccount({ data, error }) {
		if (data) {
			this.pickupCenterAddress = {
				street: getFieldValue(data, ACCOUNT_SHIPPING_STREET_FIELD),
				city: getFieldValue(data, ACCOUNT_SHIPPING_CITY_FIELD),
				state: getFieldValue(data, ACCOUNT_SHIPPING_STATE_FIELD),
				postalCode: getFieldValue(data, ACCOUNT_SHIPPING_POSTAL_CODE_FIELD),
				country: getFieldValue(data, ACCOUNT_SHIPPING_COUNTRY)
			};
		} else if (error) {
			this.addError(
				'There was an issue while retrieving the pickup center',
				error);
		}
	}

	@wire(getRecord, {
		recordId: '$deliveryCenterId',
		fields: [
			ACCOUNT_NAME_FIELD,
			ACCOUNT_SHIPPING_STREET_FIELD,
			ACCOUNT_SHIPPING_CITY_FIELD,
			ACCOUNT_SHIPPING_STATE_FIELD,
			ACCOUNT_SHIPPING_POSTAL_CODE_FIELD,
			ACCOUNT_SHIPPING_COUNTRY
		]
	})
	wiredDeliveryCenterAccount({ data, error }) {
		if (data) {
			this.deliveryCenterAddress = {
				street: getFieldValue(data, ACCOUNT_SHIPPING_STREET_FIELD),
				city: getFieldValue(data, ACCOUNT_SHIPPING_CITY_FIELD),
				state: getFieldValue(data, ACCOUNT_SHIPPING_STATE_FIELD),
				postalCode: getFieldValue(data, ACCOUNT_SHIPPING_POSTAL_CODE_FIELD),
				country: getFieldValue(data, ACCOUNT_SHIPPING_COUNTRY)
			};
		} else if (error) {
			this.addError(
				'There was an issue while retrieving the group',
				error);
		}
	}

	handleOnCancelDetailsClick() {
		this.removeError();
		this.close('cancel');
	}

	handleOnSwitchToEditClick() {
		this._isView = false;
		this._isEdit = true;
	}

	handleOnLocationTypeChange(event) {
		this.locationTypeChoice = event.target.value;
	}

	handleOnPickupLocationTypeChange(event) {
		this.pickupLocationTypeChoice = event.target.value;
	}

	handleOnDetailsFieldChange(event) {
		switch (event.target.fieldName) {
			case 'DeliveryCenter__c':
				this.deliveryCenterId = event.target.value;
				break;
			case 'PickupCenter__c':
				this.pickupCenterId = event.target.value;
				break;
			default:
				break;
		}
	}

	handleOnSaveClick() {
		this.refs.hiddenDetailsButton.click();
	}

	handleOnSubmit(event) {
		event.preventDefault();
		this.isLoading = true;
		const fields = event.detail.fields;
		fields.DeliveryLocationType__c = this.locationTypeChoice;
		fields.PickupLocationType__c = this.pickupLocationTypeChoice;
		this.template.querySelector('.detailsForm').submit(fields);
	}

	handleOnSuccess() {
		this.isLoading = false;
		this.close('saved');
	}

	handleOnError(event) {
		this.isLoading = false;
		this.addError(
			`${event.detail.message}. ${event.detail.detail}`,
			event.detail);
	}
}
