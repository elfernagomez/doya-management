import { LightningElement, track, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getTemplate from '@salesforce/apex/OrderImportController.getTemplate';
import importCsv from '@salesforce/apex/OrderImportController.importCsv';

const ERROR_COLUMNS = [
	{ label: 'Row', fieldName: 'rowNumber', type: 'number', initialWidth: 90 },
	{ label: 'Message', fieldName: 'message', type: 'text' }
];

const DEFAULT_TEMPLATE_HEADERS = [
	'Order Reference Number',
	'Due Date',
	'Location Name',
	'Product Name',
	'Quantity',
	'Unit Type',
	'Description',
	'Width',
	'Height',
	'Depth',
	'Notes'
];

const DEFAULT_TEMPLATE_SAMPLE = [
	'PO-100105',
	'2030-12-31',
	'Carnival Valor',
	'Single sided 100Lb Cover',
	'80',
	'Each/SqFt',
	'2659007_NIMKY_BF_CCL Breeze_8.5x11in_Qty10_SC.pdf',
	'10',
	'20',
	'5',
	'Any Notes?'
];

export default class OrderImportTool extends LightningElement {
	@track isLoading = false;
	@track result;
	@track rowErrors = [];

	@api
	get accountId() {
		return this.selectedAccountId;
	}

	set accountId(value) {
		this.selectedAccountId = value;
		this.showAccountPicker = !value;
	}

	templatePayload;
	selectedFile;
	selectedAccountId;
	showAccountPicker = true;

	errorColumns = ERROR_COLUMNS;

	connectedCallback() {
		this.loadTemplate();
	}

	get disableImport() {
		return this.isLoading || !this.selectedFile || !this.selectedAccountId;
	}

	get disableTemplateDownload() {
		return this.isLoading;
	}

	get hasRowErrors() {
		return this.rowErrors.length > 0;
	}

	get hasSelectedFile() {
		return !!this.selectedFile;
	}

	get selectedFileName() {
		return this.selectedFile?.name || '';
	}

	async loadTemplate() {
		this.isLoading = true;
		try {
			this.templatePayload = await getTemplate();
		} catch (error) {
			this.showToast('Error', this.extractError(error, 'Failed to load template mapping.'), 'error');
		} finally {
			this.isLoading = false;
		}
	}

	handleFileChange(event) {
		const files = event?.target?.files || event?.detail?.files || [];
		const file = files[0];
		this.selectedFile = file || null;
	}

	handleCustomerChange(event) {
		this.selectedAccountId =
			event?.detail?.recordId ||
			event?.detail?.value ||
			event?.target?.value ||
			null;
	}

	async handleDownloadTemplate() {
		try {
			let payload = this.templatePayload;
			if (!payload?.csvContent) {
				try {
					payload = await getTemplate();
					this.templatePayload = payload;
				} catch (error) {
					payload = {
						fileName: 'order-import-template.csv',
						csvContent: `${DEFAULT_TEMPLATE_HEADERS.join(',')}\n${DEFAULT_TEMPLATE_SAMPLE.join(',')}\n`
					};
					this.showToast(
						'Warning',
						`Using built-in template because metadata template could not be loaded. ${this.extractError(error, '')}`.trim(),
						'warning'
					);
				}
			}

			const csvWithBom = `\uFEFF${payload.csvContent}`;
			const dataUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(csvWithBom)}`;
			const anchor = document.createElement('a');
			anchor.href = dataUrl;
			anchor.download = payload.fileName || 'order-import-template.csv';
			anchor.style.display = 'none';
			document.body.appendChild(anchor);
			anchor.click();
			document.body.removeChild(anchor);
		} catch (error) {
			this.showToast('Error', this.extractError(error, 'Unable to download template.'), 'error');
		}
	}

	async handleImport() {
		if (!this.selectedFile) {
			this.showToast('Error', 'Select a CSV file first.', 'error');
			return;
		}

		if (!this.selectedFile.name.toLowerCase().endsWith('.csv')) {
			this.showToast('Error', 'Only .csv files are supported. Save the Excel file as CSV and retry.', 'error');
			return;
		}

		this.isLoading = true;
		this.result = null;
		this.rowErrors = [];

		try {
			const csvContent = await this.readFileAsText(this.selectedFile);
			const response = await importCsv({ csvContent, accountId: this.selectedAccountId });
			this.result = response;
			this.rowErrors = (response?.rowErrors || []).map((row, index) => ({
				...row,
				key: `${row.rowNumber}-${index}`
			}));

			if (response?.failedRows > 0) {
				this.showToast('Import completed with errors', 'Some rows failed. Review the error table below.', 'warning');
			} else {
				this.showToast('Import completed', 'Orders and Order Products were created successfully.', 'success');
			}
		} catch (error) {
			this.showToast('Error', this.extractError(error, 'Import failed.'), 'error');
		} finally {
			this.isLoading = false;
		}
	}

	readFileAsText(file) {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.onerror = () => reject(new Error('Unable to read the selected file.'));
			reader.readAsText(file);
		});
	}

	extractError(error, fallback) {
		if (Array.isArray(error?.body)) {
			return error.body.map(e => e.message).join(', ');
		}
		return error?.body?.message || error?.message || fallback;
	}

	showToast(title, message, variant) {
		this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
	}
}
