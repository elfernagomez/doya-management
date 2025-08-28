import { api, track } from 'lwc';
import InputBase from 'c/lwcBase';

export default class CheckboxGroup extends InputBase {
	@api
	get options() {
		return this._options;
	}

	set options(value) {
		this._options = value;
		this.checkboxes = (value || []).map(o => ({
			key: o.key || crypto.randomUUID(),
			...o
		}));
	}

	@api
	isRequired = false;

	_options;

	@track
	checkboxes = [];

	get fieldsetClass() {
		return "slds-form-element " + 
			(this.hasError ? "slds-form-element__has-error" : "");
	}

	handleOnChange(event) {
		const checkboxes = [...this.checkboxes];
		let option = checkboxes.find(o => o.key == event.target.dataset.key);
		option.isSelected = event.target.checked;
		this.customEvent("change", checkboxes);
	}
}