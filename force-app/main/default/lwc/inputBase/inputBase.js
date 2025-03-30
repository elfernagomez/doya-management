import LwcBase from 'c/lwcBase';
import { api } from 'lwc';

export default class InputBase extends LwcBase {
	@api
	mode = "view"; // view, edit

	get isView() {
		return this.mode == "view";
	}

	get isEdit() {
		return this.mode == "edit";
	}

	get modeOptions() {
		return [{
			label: "View",
			value: "view",
			iconName: "utility:preview",
			isChecked: this.isView
		}, {
			label: "Edit",
			value: "edit",
			iconName: "utility:edit",
			isChecked: this.isEdit
		}];
	}

	handleOnEditClick() {
		this.mode = "edit";
	}

	handleOnViewClick() {
		this.mode = "view";
	}

	handleOnModeChange(event) {
		this.mode = event.detail.value;
	}
}