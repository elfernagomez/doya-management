/**
 * Custom Lookup componenent to be used in any custom form.
 * @authro Fernando Gomez, SkyPlanner LLC
 * @version 1.0
 */
import { LightningElement, wire, api } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import search from '@salesforce/apex/GenericLookupCtrl.doSearch';
import getCurrent from '@salesforce/apex/GenericLookupCtrl.getCurrentRecord';

export default class Lookup extends LightningElement {

	// lookup label
	@api
	label;

	// placeholder
	@api
	placeholder;

	@api
	variant;
	
	@api
	iconName;

	@api
	objectApiName;

	@api
	labelField;

	@api
	subLabelField;

	@api
	searchInFields = [];

	@api
	extraSelectFields = [];

	@api
	criteria;

	@api
	required = false;

	@api
	isReadOnly = false;

	// value, an Id pointing to a record, or null is value is empty
	@api
	get value() {
		return this.recordId;
	}

	@api
	checkValidity() {
		return this.isRequired != true || this.recordId != null;
	}

	@api
	reportValidity() {
		let input = this.template.querySelector(".required-field");
		if (input)
			input.reportValidity();
	}	

	// lookn and feel props
	label;
	style;
	iconUrl;

	// the current record
	record;

	// internal record id
	recordId;

	// show menu when focused
	showMenu;

	// keywords as specified by user
	keywords;

	// resulting object selectable as per the search
	results;

	set value(v) {
		// we make sure the value
		// came from the right place
		let isGood = v == null ||
			(typeof v === "string" &&
				(v.length == 0 || v.length == 15 || v.length == 18));

		// we need an Id for this value, null is good
		if (isGood) {
			if (this.recordId != v) {
				this.recordId = v;
				this.reset();
			}
		}/*  else
			console.error("Invalid Id: " + JSON.stringify(v)); */
	}

	get isRequired() {
		return this.required == true || this.required == "true";
	}

	get someThemeIcon() {
		return this.iconUrl ? true : false;
	}

	get showCloseButon() {
		return !this.isReadOnly;
	}

	get showLabel() {
		return this.variant != "label-hidden";
	}

	get formElementClass() {
		switch (this.variant) {
			case "label-inline":
				return "slds-form-element slds-form-element_horizontal";
			default:
				return "slds-form-element slds-form-element_stacked";
		}
	}

	@wire(
		getObjectInfo,
		{ objectApiName: "$objectApiName" }
	)
	handleResult({error, data}) {
		if (data) {
			let themeInfo = data.themeInfo || {};
			// the original object cannot be expanded,
			// so we use a custom one to add properties accrdingly
			this.iconUrl = themeInfo.iconUrl;
			this.style = `background-color: #${themeInfo.color};`;
		}

		if (error)
			console.error(error);
	}

	/**
	 * main constructor
	 */
	connectedCallback() {
		this._setDefaults();
		this.reset();
	}

	/**
	 * Resets the lokkup for a new value
	 */
	reset() {
		this._clearSearch();

		// if we have no record, we fetch it
		if (this.recordId)
			this._getCurrent(r => this._applySelection(r));
		else
			this._clearSelection();
	}

	/**
	 * Handles On Blur
	 * @param {*} e 
	 */
	handleOnBlur(event) {
		// we hide the menu in 300 ms
		setTimeout(() => this._clearSearch(), 300);
	}

	/**
	 * Handles On Change
	 * @param {*} event 
	 */
	handleOnChange(event) {
		// we update the value ok keywords
		this.keywords = (event.target.value || "").trim();

		// if keywords were cleared, we clear the search
		if (!this.keywords) {
			this._clearSearch();
		} else {
			// we'll search for results and
			// show them in the list
			this.showMenu = true;
			this._search(result => {
				// Add labelField property to records
				this.results = [];
				result.forEach(r => this.results.push(this._prepareRecord(r)));
			});
		}
	}

	/**
	 * Select the current record
	 * @param {*} event 
	 */
	handleOnSelect(event) {
		let index = event.currentTarget.dataset.index;
		this._applySelection(this.results[index]);
		// this._clearSearch();
		this.dispatchEvent(new CustomEvent("change", {
			detail: {
				recordId: this.recordId,
				record: this.record
			}
		}));
	}

	/**
	 * Select the current record
	 * @param {*} event 
	 */
	handleOnRemoveSelection(event) {
		this._clearSelection();
		this._clearSearch();
		this.dispatchEvent(new CustomEvent("change", {
			detail: {
				recordId: this.recordId,
				record: this.record
			}
		}));
	}

	/**
	 * Sets default values for empty fields
	 */
	_setDefaults() {
		var defaultNameField = this._getDefaultNameField();

		if (!this.labelField)
			this.labelField = defaultNameField;

		// if no search in fields were added,
		// we add the label and the default name field if different
		if (!this.searchInFields.length) {
			this.searchInFields.push(this.labelField);

			if (this.labelField != defaultNameField)
				this.searchInFields.push(defaultNameField);

			/* if (this.subLabelField)
				this.searchInFields.push(this.subLabelField); */
		}

		if (!this.iconName)
			this.iconName = "utility:sobject";
	}

	/**
	 * Searches for records in the server
	 * @param {*} oncomplete 
	 */
	_search(oncomplete) {
		search({
			"keyword": this.keywords,
			"objectName": this.objectApiName,
			"searchInFields": this.searchInFields,
			"extraSelectFields": this.extraSelectFields,
			"labelField": this.labelField,
			"subLabelField": this.subLabelField,
			"criteria": this.criteria
		})
		.then(result => {
			oncomplete(result);
		})
		.catch(error => {
			console.error(error);
			oncomplete([]);
		});
	}

	/**
	 * Fetches an existing record
	 * @param {*} oncomplete 
	 */
	_getCurrent(oncomplete) {
		getCurrent({
			"recordId": this.recordId,
			"objectName": this.objectApiName,
			"searchInFields": this.searchInFields,
			"extraSelectFields": this.extraSelectFields,
			"labelField": this.labelField,
			"subLabelField": this.subLabelField
		})
		.then(result => {
			this.dispatchEvent(new CustomEvent("currentrecordfetch", {
				detail: {
					recordId: result.Id,
					record: result
				}
			}));
			oncomplete(result);
		})
		.catch(error => {
			console.error(error);
			oncomplete(null);
		});
	}

	/**
	 * Removes the result set and clears the search
	 */
	_clearSearch() {
		this.showMenu = false;
		this.keywords = null;
		this.results = [];
	}

	/**
	 * Applies the record as the selection
	 */
	_applySelection(record) {
		if (!record)
			return;

		this.record = this._prepareRecord(record);
		this.recordId = record ? record.Id : null;
	}

	_prepareRecord(record) {
		let cloned = this._deepClone(record);
		cloned.label = cloned[this.labelField];
		cloned.subLabel = cloned[this.subLabelField];
		return cloned;
	}

	/**
	 * Removes the selected record
	 */
	_clearSelection() {
		this.record = null;
		this.recordId = null;
	}

	_getDefaultNameField() {
		if (this.objectApiName.endsWith("__mdt"))
			return "DeveloperName";

		switch (this.objectApiName) {
			case "Case":
				return "CaseNumbe";
			case "ContractLineItem":
				return "LineItemNumber";
			default:
				return "Name";
		}
	}

	_deepClone(obj) {
		return JSON.parse(JSON.stringify(obj));
	}
}