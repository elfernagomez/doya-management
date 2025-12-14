import { api, track } from 'lwc';
import LightningModal from 'lightning/modal';
import searchRecords from '@salesforce/apex/RecordSearchCtrl.searchRecords';

export default class RecordLookupModal extends LightningModal {
	@api label = 'Find Record';
	@api objectApiName = 'WorkOrder';
	@api columns = [{
		label: 'Name',
		fieldName: 'Name',
		type: 'text'
	}];
	@api filters = [];
	
	@api limitSize = 50;

	@track searchTerm = '';
	@track results = [];
	@track isLoading = false;
	@track error;
	
	get showNoResults() {
		return !this.isLoading && this.results.length == 0;
	}

	get actualColumns() {
		return [
			...this.columns.filter(col => col.isHidden != true),
			{
				type: 'button',
				label: "Action",
				initialWidth: 120,
				typeAttributes: {
					label: 'Select',
					name: 'select',
					variant: 'brand-outline',
					iconName: 'utility:chevronright',
					iconPosition: 'right'
				}
			}
		];
	}

	_initialized = false;
	_renderedOnce = false;

	connectedCallback() {
		Promise.resolve().then(() => this.handleSearchClick());
	}

	renderedCallback() {
		// Only run once after the modal is first rendered
		if (this._renderedOnce) return;
		this._renderedOnce = true;

		// Try to focus the search input when the modal opens
		const input = this.template &&
			(this.template.querySelector('lightning-input') ||
			this.template.querySelector('input'));

		if (input && typeof input.focus === 'function') {
			input.focus();
		}
	}

	handleInputChange(event) {
		this.searchTerm = event.target.value;
		this.error = undefined;
		this.handleSearchClick();
	}

	// use Promise (.then) as requested
	handleSearchClick() {
		this.isLoading = true;
		this.error = undefined;

		searchRecords({
			objectApiName: this.objectApiName,
			searchTerm: this.searchTerm,
			displayFields: this.columns.map(col => col.fieldName),
			limitSize: this.limitSize,
			lookupFilters: this.filters
		})
		.then(res => {
			this.results = res;
		})
		.catch(e => {
			this.error = e?.body?.message || e?.message || String(e);
		})
		.finally(() => {
			this.isLoading = false;
		});
	}

	handleRowClick(event) {
		const row = event.detail.row;
		this.close({ recordId: row?.Id, record: row });
	}

	handleCancel() {
		this.close();
	}
}