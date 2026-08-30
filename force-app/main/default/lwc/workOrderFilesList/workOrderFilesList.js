import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import getWorkOrderFiles
	from '@salesforce/apex/WorkOrderListViewCtrl.getWorkOrderFiles';

export default class WorkOrderFilesList extends NavigationMixin(LightningElement) {
	@api
	recordId;

	files = [];
	error;
	wiredFilesResult;

	get hasFiles() {
		return this.files.length > 0;
	}

	get hasError() {
		return this.error != null;
	}

	get errorMessage() {
		const body = this.error?.body;
		if (Array.isArray(body)) {
			return body.map(e => e.message).join(', ');
		}
		return body?.message || this.error?.message || 'Unable to load files.';
	}

	@wire(getWorkOrderFiles, {
		workOrderId: '$recordId'
	})
	wiredFiles(result) {
		this.wiredFilesResult = result;
		const { data, error } = result;

		if (data) {
			this.error = null;
			this.files = data
				.map(file => {
					const contentDocumentId = file.contentDocumentId;
					if (!contentDocumentId) {
						return null;
					}

					const fileType = file.fileType || 'File';

					return {
						id: contentDocumentId,
						title: file.title || 'Untitled file',
						fileType,
						iconName: this.getDoctypeIcon(fileType),
						sizeLabel: this.formatBytes(file.contentSize),
						createdLabel: this.formatDate(file.createdDate)
					};
				})
				.filter(file => file != null);
		} else if (error) {
			this.files = [];
			this.error = error;
		}
	}

	handleUploadFinished() {
		if (this.wiredFilesResult) {
			refreshApex(this.wiredFilesResult);
		}
	}

	handleOpenFileRecordClick(event) {
		const contentDocumentId = event.currentTarget.dataset.fileId;
		if (!contentDocumentId) {
			return;
		}

		this[NavigationMixin.Navigate]({
			type: 'standard__recordPage',
			attributes: {
				recordId: contentDocumentId,
				objectApiName: 'ContentDocument',
				actionName: 'view'
			}
		});
	}

	handlePreviewClick(event) {
		const contentDocumentId = event.currentTarget.dataset.fileId;
		if (!contentDocumentId) {
			return;
		}

		this[NavigationMixin.Navigate]({
			type: 'standard__namedPage',
			attributes: {
				pageName: 'filePreview'
			},
			state: {
				selectedRecordId: contentDocumentId
			}
		});
	}

	getDoctypeIcon(fileType) {
		const key = String(fileType || '').toUpperCase();
		const iconByType = {
			PDF: 'doctype:pdf',
			PNG: 'doctype:image',
			JPG: 'doctype:image',
			JPEG: 'doctype:image',
			GIF: 'doctype:image',
			BMP: 'doctype:image',
			WEBP: 'doctype:image',
			SVG: 'doctype:svg',
			DOC: 'doctype:word',
			DOCX: 'doctype:word',
			ODT: 'doctype:word',
			RTF: 'doctype:rtf',
			XLS: 'doctype:excel',
			XLSX: 'doctype:excel',
			ODS: 'doctype:excel',
			CSV: 'doctype:csv',
			PPT: 'doctype:ppt',
			PPTX: 'doctype:ppt',
			KEY: 'doctype:keynote',
			TXT: 'doctype:txt',
			MD: 'doctype:txt',
			XML: 'doctype:xml',
			HTML: 'doctype:html',
			HTM: 'doctype:html',
			JS: 'doctype:html',
			CSS: 'doctype:html',
			ZIP: 'doctype:zip',
			RAR: 'doctype:zip',
			SEVEN_Z: 'doctype:zip',
			MP3: 'doctype:audio',
			WAV: 'doctype:audio',
			AAC: 'doctype:audio',
			MP4: 'doctype:mp4',
			MOV: 'doctype:video',
			AVI: 'doctype:video',
			WMV: 'doctype:video'
		};

		return iconByType[key] || 'doctype:attachment';
	}

	formatDate(rawValue) {
		if (!rawValue) {
			return '';
		}

		return new Intl.DateTimeFormat(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(new Date(rawValue));
	}

	formatBytes(value) {
		const bytes = Number(value);
		if (!Number.isFinite(bytes) || bytes <= 0) {
			return '0 B';
		}

		const sizes = ['B', 'KB', 'MB', 'GB'];
		const index = Math.min(
			Math.floor(Math.log(bytes) / Math.log(1024)),
			sizes.length - 1
		);
		const amount = bytes / (1024 ** index);
		return `${amount.toFixed(index === 0 ? 0 : 1)} ${sizes[index]}`;
	}
}
