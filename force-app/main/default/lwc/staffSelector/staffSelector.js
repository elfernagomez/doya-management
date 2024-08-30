import LightningModal from 'lightning/modal';

export function selectStaff() {
	StaffSelector.open({
		size: "small"
	});
}

export default class StaffSelector extends LightningModal {
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
}