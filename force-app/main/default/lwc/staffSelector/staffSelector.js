import LwcBase from 'c/lwcBase';
import { wire, track } from "lwc";
import { getRecords } from 'lightning/uiRecordApi';

import staffLogin
	from "@salesforce/apex/StaffManager.staffLogin";

import WORK_ORDER_LINE_ITEM_OBJECT from '@salesforce/schema/Staff__c';
import PIN_FIELD from "@salesforce/schema/Staff__c.";

export function selectStaff(handleOnStaffConfirmed) {
	/* StaffSelector.open({
		size: "small"
	}); */
}

export default class StaffSelector extends LwcBase {
	staffId;
	currentStaff = null;
	showPinIncorrectMessage = false;
	isLoading = false;

	@track
	numbers = [{
		key: "1",
		value: null
	}, {
		key: "2",
		value: null
	}, {
		key: "3",
		value: null
	}, {
		key: "4",
		value: null
	}, {
		key: "5",
		value: null
	}, {
		key: "6",
		value: null
	}];

	get showInputs() {
		return this.staffId != null;
	}

	get isPinReady() {
		return this.numbers.filter(n => n.value).length == this.numbers.length;
	}

	get pin() {
		return this.numbers.filter(n => n.value).map(n => n.value).join("");
	}

	get isLoggedIn() {
		return this.currentStaff != null;
	}

	@wire(getRecords, {
		records: "$staffId"
	})
	wiredRecords({ error, data }) {
		if (data) {
			this.pin = getFieldValue(data, PIN_FIELD);
		} else if (error) {
			console.log("error: ", error);
		}
	}

	handleOnSelectedStaffChange(event) {
		this.staffId = event.detail.recordId;
	}

	handleOnKeyUp(event) {
		const value = event.target.value || null;
		const index = parseInt(event.currentTarget.dataset.index);
		this.numbers[index].value = value;

		this.removeError();
		this.showPinIncorrectMessage = false;

		if (value) {
			const inputs = this.template.querySelectorAll(".number-input");
			const input = inputs[index + 1];
			if (input)
				input.focus();

			if (this.isPinReady)
				this.login();
		}
	}

	handleOnLogoutClick() {
		this.logout();
	}

	login() {
		this.isLoading = true;
		console.log(this.pin);
		staffLogin({
			staffId: this.staffId,
			pin: this.pin
		})
		.then(staff => {
			this.isLoading = false;
			this.showPinIncorrectMessage = staff == null;
			this.currentStaff = staff;
			this.resetFields();
		})
		.catch(error => {
			this.addError(error);
			this.isLoading = false;
			this.showPinIncorrectMessage = true;
			this.currentStaff = null;
			this.resetFields();
		});
	}

	logout() {
		this.removeError();
		this.isLoading = false;
		this.showPinIncorrectMessage = false;
		this.currentStaff = null;
		this.resetFields();
	}

	resetFields() {
		this.numbers.forEach(n => n.value = null);
		this.numbers = [...this.numbers];

		const input = this.getComponent(".number-input");
		if (input)
			input.focus();
	}
}