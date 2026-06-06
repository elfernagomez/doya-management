import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getTemplateOptions from '@salesforce/apex/PackingSlipController.getTemplateOptions';
import getPdfUrl from '@salesforce/apex/PackingSlipController.getPdfUrl';
import cloneDefaultTemplate from '@salesforce/apex/PackingSlipController.cloneDefaultTemplate';

const PAGE_SIZE_LABELS = {
	LABEL_6X4: '6" x 4"',
	LETTER_8_5X11: '8.5" x 11"'
};

export default class PackingSlipGenerator extends LightningElement {
	@api
	recordId;

	@track
	allTemplateOptions = [];

	@track
	isLoading = false;

	@track
	errorMessage;

	@track
	previewUrl;

	selectedPageSize;
	selectedTemplateKey;
	pdfUrl;
	pendingPrint = false;

	connectedCallback() {
		this.loadTemplateOptions();
	}

	get pageSizeOptions() {
		const dimensions = new Set();
		(this.allTemplateOptions || []).forEach(option => {
			if (option.templateType !== 'HTML')
				return;
			dimensions.add(option.dimensions || 'LETTER_8_5X11');
		});

		return Array.from(dimensions)
			.sort()
			.map(value => ({
				label: PAGE_SIZE_LABELS[value] || value,
				value
			}));
	}

	get filteredTemplateOptions() {
		return this.allTemplateOptions
			.filter(option => {
				if (option.templateType !== 'HTML')
					return false;

				const optionDimensions = option.dimensions || 'LETTER_8_5X11';
				return !this.selectedPageSize || optionDimensions === this.selectedPageSize;
			})
			.map(option => ({
				label: `${option.label} (${option.source})`,
				value: option.templateKey
			}));
	}

	get hasPreview() {
		return !!this.previewUrl;
	}

	get disableActionButtons() {
		return this.isLoading || !this.selectedTemplateKey;
	}

	async loadTemplateOptions() {
		this.isLoading = true;
		this.errorMessage = null;
		try {
			const options = await getTemplateOptions({ recordId: this.recordId });
			this.allTemplateOptions = options || [];
			this.ensureSelectedPageSize();
			this.ensureSelectedTemplate();
			this.refreshPreview();
		} catch (error) {
			this.handleError(error, 'Failed to load packing slip templates.');
		} finally {
			this.isLoading = false;
		}
	}

	ensureSelectedTemplate() {
		const filtered = this.filteredTemplateOptions;
		if (!filtered.length) {
			this.selectedTemplateKey = null;
			return;
		}

		const templateStillVisible = filtered.some(option => option.value === this.selectedTemplateKey);
		if (!templateStillVisible)
			this.selectedTemplateKey = filtered[0].value;
	}

	ensureSelectedPageSize() {
		const options = this.pageSizeOptions;
		if (!options.length) {
			this.selectedPageSize = null;
			return;
		}

		const selectedStillVisible = options.some(option => option.value === this.selectedPageSize);
		if (!selectedStillVisible)
			this.selectedPageSize = options[0].value;
	}

	handlePageSizeChange(event) {
		this.selectedPageSize = event.detail.value;
		this.ensureSelectedTemplate();
		this.refreshPreview();
	}

	handleTemplateChange(event) {
		this.selectedTemplateKey = event.detail.value;
		this.clearPreview();
	}

	buildPreviewUrl(printMode = false) {
		if (!this.recordId || !this.selectedTemplateKey)
			return null;

		let url =
			`/apex/PackingSlipPreview?mode=preview&recordId=${encodeURIComponent(this.recordId)}` +
			`&templateKey=${encodeURIComponent(this.selectedTemplateKey)}` +
			`&v=${Date.now()}`;
		if (this.selectedPageSize)
			url += `&pageSize=${encodeURIComponent(this.selectedPageSize)}`;
		if (printMode)
			url += '&print=1';
		return url;
	}

	refreshPreview() {
		this.errorMessage = null;
		this.pendingPrint = false;
		this.previewUrl = this.buildPreviewUrl();
	}

	async handlePreviewClick() {
		this.refreshPreview();
	}

	async handlePrintClick() {
		this.errorMessage = null;
		const targetPreviewUrl = this.buildPreviewUrl();
		if (!targetPreviewUrl)
			return;

		if (this.previewUrl === targetPreviewUrl && this.postPrintMessage())
			return;

		this.pendingPrint = true;
		this.previewUrl = targetPreviewUrl;
	}

	handlePreviewLoad() {
		if (!this.pendingPrint)
			return;

		this.pendingPrint = false;
		if (!this.postPrintMessage()) {
			this.showToast('Print failed', 'The preview could not be printed from the embedded frame.', 'warning');
		}
	}

	async handleOpenPdfClick() {
		this.isLoading = true;
		this.errorMessage = null;
		try {
			const url = await getPdfUrl({
				recordId: this.recordId,
				templateKey: this.selectedTemplateKey,
				pageSize: this.selectedPageSize
			});
			this.pdfUrl = url;
			window.open(url, '_blank');
		} catch (error) {
			this.handleError(error, 'Failed to prepare the PDF rendering URL.');
		} finally {
			this.isLoading = false;
		}
	}

	async handleCloneDefaultClick() {
		this.isLoading = true;
		this.errorMessage = null;
		try {
			await cloneDefaultTemplate({ templateKey: this.selectedTemplateKey });
			this.showToast('Template cloned', 'A subscriber-editable template record was created.', 'success');
			await this.loadTemplateOptions();
		} catch (error) {
			this.handleError(error, 'Failed to clone the packaged template.');
		} finally {
			this.isLoading = false;
		}
	}

	handleError(error, fallbackMessage) {
		this.errorMessage = error?.body?.message || error?.message || fallbackMessage;
	}

	clearPreview() {
		this.pendingPrint = false;
		this.previewUrl = null;
	}

	postPrintMessage() {
		const previewFrame = this.refs?.previewFrame;
		const previewWindow = previewFrame?.contentWindow;
		if (!previewWindow)
			return false;

		previewWindow.postMessage({ type: 'packing-slip-print' }, '*');
		return true;
	}

	showToast(title, message, variant) {
		this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
	}
}