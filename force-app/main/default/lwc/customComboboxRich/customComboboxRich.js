import { LightningElement, api } from 'lwc';

export default class CustomComboboxRich extends LightningElement {
	@api label = '';
	@api placeholder = 'Select an option';
	@api required = false;
	@api disabled = false;
	@api errorMessage = '';
	@api name;
	@api variant = 'standard'; // standard, label-inline, label-hidden

	/**
	 * Options array with the following structure:
	 * [
	 *   {
	 *     label: 'Option 1',
	 *     value: 'opt1',
	 *     subtitle: 'Optional description',
	 *     iconName: 'standard:account',   // Optional SLDS icon
	 *     iconAlt: 'Account',
	 *     badge: 'New',                     // Optional badge text
	 *     badgeVariant: 'success'           // success, warning, error, or default
	 *   }
	 * ]
	 */
	@api
	get options() {
		return this._options;
	}
	set options(value) {
		this._options = value || [];
		this.processOptions();
	}

	@api
	get value() {
		return this._value;
	}
	set value(val) {
		this._value = val;
		this.updateSelectedOption();
	}

	// Private properties
	_options = [];
	_value = '';
	isOpen = false;
	searchTerm = '';
	selectedOption = null;
	processedOptions = [];
	blurTimeout;

	// Computed properties
	get comboboxId() {
		return `combobox-${this.name || 'rich'}`;
	}

	get listboxId() {
		return `listbox-${this.name || 'rich'}`;
	}

	get helpTextId() {
		return `help-text-${this.name || 'rich'}`;
	}

	get formElementClass() {
		let classes = 'slds-form-element';
		if (this.variant === 'label-inline') {
			classes += ' slds-form-element_horizontal';
		}
		return classes;
	}

	get labelClass() {
		let classes = 'slds-form-element__label';
		if (this.variant === 'label-hidden') {
			classes += ' slds-assistive-text';
		}
		return classes;
	}

	get comboboxClass() {
		let classes = 'slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click';
		if (this.isOpen) {
			classes += ' slds-is-open';
		}
		return classes;
	}

	get containerClass() {
		let classes = 'slds-combobox_container';
		if (this.selectedOption) {
			classes += ' slds-has-selection';
		}
		return classes;
	}

	get isReadonly() {
		return this.disabled;
	}

	get showClearButton() {
		return this.selectedOption && !this.disabled;
	}

	get filteredOptions() {
		if (!this.searchTerm) {
			return this.processedOptions;
		}
		
		const term = this.searchTerm.toLowerCase();
		return this.processedOptions.filter(opt => {
			const labelMatch = opt.label?.toLowerCase().includes(term);
			const subtitleMatch = opt.subtitle?.toLowerCase().includes(term);
			return labelMatch || subtitleMatch;
		});
	}

	get showNoResults() {
		return this.filteredOptions.length === 0 && this.searchTerm;
	}

	// Lifecycle hooks
	connectedCallback() {
		this.processOptions();
		this.updateSelectedOption();
	}

	// Event handlers
	handleFocus() {
		if (!this.disabled) {
			this.isOpen = true;
			this.searchTerm = '';
		}
	}

	handleInput(event) {
		this.searchTerm = event.target.value;
		this.isOpen = true;
	}

	handleBlur() {
		// Delay to allow click events to fire
		this.blurTimeout = setTimeout(() => {
			this.isOpen = false;
			this.updateDisplayValue();
		}, 200);
	}

	handleSelect(event) {
		const selectedValue = event.currentTarget.dataset.value;
		this._value = selectedValue;
		
		this.updateSelectedOption();
		this.updateDisplayValue();
		this.isOpen = false;

		// Dispatch change event
		this.dispatchEvent(new CustomEvent('change', {
			detail: {
				value: this._value,
				option: this.selectedOption
			}
		}));
	}

	handleClear(event) {
		event.stopPropagation();
		this._value = '';
		this.selectedOption = null;
		this.searchTerm = '';
		
		this.dispatchEvent(new CustomEvent('change', {
			detail: {
				value: '',
				option: null
			}
		}));
	}

	// Helper methods
	processOptions() {
		this.processedOptions = this._options.map(opt => {
			const isSelected = opt.value === this._value;
			
			return {
				...opt,
				isSelected: isSelected,
				itemClass: this.getItemClass(isSelected),
				iconContainerClass: this.getIconContainerClass(opt.iconName),
				badgeClass: this.getBadgeClass(opt.badgeVariant)
			};
		});
	}

	updateSelectedOption() {
		if (this._value) {
			this.selectedOption = this._options.find(opt => opt.value === this._value);
			this.searchTerm = this.selectedOption?.label || '';
		} else {
			this.selectedOption = null;
			this.searchTerm = '';
		}
		this.processOptions();
	}

	updateDisplayValue() {
		this.searchTerm = this.selectedOption?.label || '';
	}

	getItemClass(isSelected) {
		let classes = 'slds-media slds-listbox__option slds-listbox__option_entity slds-listbox__option_has-meta';
		if (isSelected) {
			classes += ' slds-is-selected';
		}
		return classes;
	}

	getIconContainerClass(iconName) {
		if (!iconName) return '';
		
		// Extract icon category from icon name (e.g., 'standard:account' -> 'standard')
		const category = iconName.split(':')[0];
		return `slds-icon_container slds-icon-${category}-${iconName.split(':')[1] || 'default'}`;
	}

	getBadgeClass(variant) {
		const baseClass = 'slds-badge';
		switch(variant) {
			case 'success':
				return `${baseClass} slds-theme_success`;
			case 'warning':
				return `${baseClass} slds-theme_warning`;
			case 'error':
				return `${baseClass} slds-theme_error`;
			default:
				return baseClass;
		}
	}

	// Public methods
	@api
	focus() {
		const input = this.template.querySelector('input');
		if (input) {
			input.focus();
		}
	}

	@api
	blur() {
		const input = this.template.querySelector('input');
		if (input) {
			input.blur();
		}
	}

	@api
	reportValidity() {
		if (this.required && !this._value) {
			this.errorMessage = 'This field is required';
			return false;
		}
		this.errorMessage = '';
		return true;
	}

	@api
	checkValidity() {
		return !this.required || !!this._value;
	}
}
