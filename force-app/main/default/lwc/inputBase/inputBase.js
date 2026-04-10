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
			label: "Edit",
			value: "edit",
			iconName: "utility:edit",
			isChecked: this.isEdit,
			isNotChecked: !this.isEdit
		}, {
			label: "Done Editing",
			value: "view",
			iconName: "utility:close",
			isChecked: this.isView,
			isNotChecked: !this.isView
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

	handleOnModeClick(event) {
		this.mode = event.target.dataset.value;
	}
}