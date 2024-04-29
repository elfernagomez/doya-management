import LwcBase from "c/lwcBase";
import { track, api } from "lwc";

export default class InputWithSuggestions extends LwcBase {
	@api
	name;
	
	@api
	label;
	
	@api
	value;
	
	@api
	required;

	@api
	options;

	showDropdown = false;

	@track
	dropdownOptions;

	@api
	checkValidity() {
		return this.getComponent(`lightning-input`).checkValidity();
	}

	@api
	reportValidity() {
		this.getComponent(`lightning-input`).reportValidity();
	}

	@api
	setCustomValidity(message) {
		this.getComponent(`lightning-input`).setCustomValidity(message);
	}

	handleOnChange(event) {
		this.value = event.target.value;
		if (this.value && this.options && this.calculateOptions(this.value))
			this.openDropdown();
		else
			this.closeDropdown();
	}

	handleOnBlur(event) {
		setTimeout(() => this.closeDropdown(), 300);
	}

	handleOnSuggestionClick(event) {
		let index = event.currentTarget.dataset.index;
		let option = this.dropdownOptions[index];
		let input = this.getComponent(`lightning-input`);
		let selectionStart = input.selectionStart;
		let selectionEnd = input.selectionEnd;
		this.applySuggestion(option, selectionStart, selectionEnd);
	}

	calculateOptions(v) {
		let l = v.toLowerCase();
		this.dropdownOptions = this.options.filter(o => o.toLowerCase().includes(l));
		return this.dropdownOptions.length > 0;
	}

	openDropdown() {
		this.showDropdown = true;
	}

	closeDropdown() {
		this.showDropdown = false;
	}

	applySuggestion(suggestion, selectionStart, selectionEnd) {
		this.value = suggestion;
		/* if (selectionStart != selectionEnd)
			this.value =
				this.value.substring(0, selectionStart) +
				suggestion +
				this.value.substring(selectionEnd + 1);
		else {
			let spaceBeforeIndex = this.value.lastIndexOf(" ", selectionStart);
			let spaceAfterIndex = this.value.indexOf(" ", spaceBeforeIndex + 1);
			this.value =
				this.value.substring(0, spaceBeforeIndex) +
				suggestion +
				this.value.substring(spaceAfterIndex + 1);
		} */
	}
}