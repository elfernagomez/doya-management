import LwcBase from "c/lwcBase";
import { api } from "lwc";

export default class CustomCombobox extends LwcBase {
	@api
	label;

	@api
	get value() {
		return this._value;
	};

	set value(v) {
		this._value = v?.trim() || null;
		this.editingValue = this._value;
	}

	@api
	required = false;

	@api
	options = [];

	showDropdown = false;
	_value;
	editingValue

	get hasValue() {
		return this._value != null
	}

	handleOnFocus() {
		this.showDropdown = true;
	}

	handleOnBlur() {
		setTimeout(() => {
			this.showDropdown = false;
			// if there is text written that
			// that has not been saved, we go back
			// to the saved option
			if (this.editingValue != this._value)
				this.setValue(this._value, false);
		}, 200);
	}

	handleOnChange(event) {
		event.stopPropagation();
		this.editingValue = event.target.value.trim();
	}

	handleOnCurrentEditingValueClick() {
		this.setValue(this.editingValue, true);
	}

	handleOnKeydown(event) {
		// if Enter was pressed
		if (event.keyCode == 13)
			this.setValue(this.editingValue, true);
	}

	handleOnOptionClick(event) {
		let index = parseInt(event.currentTarget.dataset.index);
		this.setValue(this.options[index].value, true);
	}

	handleOnClearClick() {
		this.setValue(null, true);
	}

	setValue(v, doNotify) {
		this._value = v;
		this.editingValue = v;
		if (doNotify)
			this.customEvent("change", {
				value: this._value
			});
	}
}