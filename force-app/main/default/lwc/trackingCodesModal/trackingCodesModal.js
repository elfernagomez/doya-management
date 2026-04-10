import { api } from 'lwc';
import LightningModal from 'lightning/modal';

const BARCODE_IMAGE_BASE_URL =
	'https://bwipjs-api.metafloor.com/?bcid=code128&includetext&scale=3&height=12&text=';
const QR_IMAGE_BASE_URL =
	'https://quickchart.io/qr?margin=1&size=220&text=';

export default class TrackingCodesModal extends LightningModal {
	@api
	trackingNumber;

	@api
	packingSlipName;

	barcodePreviewAvailable = true;
	qrPreviewAvailable = true;

	get normalizedTrackingNumber() {
		return (this.trackingNumber || '').trim();
	}

	get modalTitle() {
		return this.packingSlipName ?
			`${this.packingSlipName} Tracking Codes` :
			'Tracking Codes';
	}

	get barcodeImageUrl() {
		return `${BARCODE_IMAGE_BASE_URL}${encodeURIComponent(this.normalizedTrackingNumber)}`;
	}

	get qrImageUrl() {
		return `${QR_IMAGE_BASE_URL}${encodeURIComponent(this.normalizedTrackingNumber)}`;
	}

	get showBarcodeImage() {
		return !!this.normalizedTrackingNumber && this.barcodePreviewAvailable;
	}

	get showQrImage() {
		return !!this.normalizedTrackingNumber && this.qrPreviewAvailable;
	}

	get previewHelpText() {
		if (this.showBarcodeImage && this.showQrImage)
			return null;

		return 'If a preview does not load in your org, copy the tracking number and use it directly.';
	}

	handlePreviewError(event) {
		const previewType = event.target?.dataset?.previewType;

		if (previewType === 'barcode')
			this.barcodePreviewAvailable = false;

		if (previewType === 'qr')
			this.qrPreviewAvailable = false;
	}

	async handleCopyClick() {
		try {
			await navigator.clipboard.writeText(this.normalizedTrackingNumber);
		} catch (error) {
			// Copy is a convenience action. Leave the value visible if clipboard is unavailable.
		}
	}

	handleCloseClick() {
		this.close();
	}
}