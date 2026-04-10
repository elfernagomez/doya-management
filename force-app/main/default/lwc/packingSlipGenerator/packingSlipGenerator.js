import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import getTemplateOptions from '@salesforce/apex/PackingSlipController.getTemplateOptions';
import getPdfUrl from '@salesforce/apex/PackingSlipController.getPdfUrl';
import generateZpl from '@salesforce/apex/PackingSlipController.generateZpl';
import cloneDefaultTemplate from '@salesforce/apex/PackingSlipController.cloneDefaultTemplate';

const OUTPUT_MODE_OPTIONS = [
	{ label: 'Screen Preview', value: 'SCREEN' },
	{ label: 'Browser Print', value: 'PRINT' },
	{ label: 'PDF', value: 'PDF' },
	{ label: 'ZPL', value: 'ZPL' }
];

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

	@track
	zplOutput;

	selectedOutputMode = 'SCREEN';
	selectedTemplateKey;
	pdfUrl;
	pendingPrint = false;

	connectedCallback() {
		this.loadTemplateOptions();
	}

	get outputModeOptions() {
		return OUTPUT_MODE_OPTIONS;
	}

	get filteredTemplateOptions() {
		return this.allTemplateOptions
			.filter(option => {
				if (this.selectedOutputMode === 'PRINT')
					return option.outputMode === 'SCREEN' || option.outputMode === 'PRINT';
				return option.outputMode === this.selectedOutputMode;
			})
			.map(option => ({
				label: `${option.label} (${option.source})`,
				value: option.templateKey
			}));
	}

	get hasPreview() {
		return !!this.previewUrl;
	}

	get hasZplOutput() {
		return !!this.zplOutput;
	}

	get disableActionButtons() {
		return this.isLoading || !this.selectedTemplateKey;
	}

	get previewTitle() {
		return this.selectedOutputMode === 'PRINT' ? 'Print Preview' : 'On-Screen Preview';
	}

	async loadTemplateOptions() {
		this.isLoading = true;
		this.errorMessage = null;
		try {
			const options = await getTemplateOptions({ recordId: this.recordId });
			this.allTemplateOptions = options || [];
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

	handleOutputModeChange(event) {
		this.selectedOutputMode = event.detail.value;
		this.clearPreview();
		this.zplOutput = null;
		this.ensureSelectedTemplate();
	}

	handleTemplateChange(event) {
		this.selectedTemplateKey = event.detail.value;
		this.clearPreview();
		this.zplOutput = null;
	}

	buildPreviewUrl(printMode = false) {
		if (!this.recordId || !this.selectedTemplateKey)
			return null;

		let url =
			`/apex/PackingSlipPreview?mode=preview&recordId=${encodeURIComponent(this.recordId)}` +
			`&templateKey=${encodeURIComponent(this.selectedTemplateKey)}`;
		if (printMode)
			url += '&print=1';
		return url;
	}

	refreshPreview() {
		this.errorMessage = null;
		this.pendingPrint = false;
		this.previewUrl = this.buildPreviewUrl();
		this.zplOutput = null;
	}

	async handlePreviewClick() {
		this.refreshPreview();
	}

	async handlePrintClick() {
		this.errorMessage = null;
		this.zplOutput = null;
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
				templateKey: this.selectedTemplateKey
			});
			this.pdfUrl = url;
			window.open(url, '_blank');
		} catch (error) {
			this.handleError(error, 'Failed to prepare the PDF rendering URL.');
		} finally {
			this.isLoading = false;
		}
	}

	async handleShowZplClick() {
		this.isLoading = true;
		this.errorMessage = null;
		try {
			this.clearPreview();
			this.zplOutput = await generateZpl({
				recordId: this.recordId,
				templateKey: this.selectedTemplateKey
			});
		} catch (error) {
			this.handleError(error, 'Failed to generate ZPL output.');
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

	async handleCopyZplClick() {
		try {
			await navigator.clipboard.writeText(this.zplOutput || '');
			this.showToast('Copied', 'ZPL output copied to your clipboard.', 'success');
		} catch (error) {
			this.showToast('Copy failed', 'Clipboard access is not available in this browser.', 'warning');
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