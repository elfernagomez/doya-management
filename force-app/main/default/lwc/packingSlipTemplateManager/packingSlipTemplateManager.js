import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

import listSubscriberTemplates from '@salesforce/apex/PackingSlipController.listSubscriberTemplates';
import setTemplateActive from '@salesforce/apex/PackingSlipController.setTemplateActive';

export default class PackingSlipTemplateManager extends LightningElement {
	@api
	providerKey = 'SHIPMENT';

	@track
	templates = [];

	@track
	isLoading = false;

	connectedCallback() {
		this.loadTemplates();
	}

	get hasTemplates() {
		return this.templates.length > 0;
	}

	async loadTemplates() {
		this.isLoading = true;
		try {
			const templates = await listSubscriberTemplates({ providerKey: this.providerKey });
			this.templates = (templates || []).map(template => ({
				...template,
				statusLabel: template.isActive ? 'Active' : 'Inactive',
				actionLabel: template.isActive ? 'Deactivate' : 'Activate'
			}));
		} catch (error) {
			this.showToast('Error', error?.body?.message || 'Failed to load subscriber templates.', 'error');
		} finally {
			this.isLoading = false;
		}
	}

	async handleActivateClick(event) {
		const templateId = event.currentTarget.dataset.templateId;
		const isActive = event.currentTarget.dataset.active !== 'true';
		this.isLoading = true;
		try {
			await setTemplateActive({ templateId, isActive });
			this.showToast('Saved', 'Template activation updated.', 'success');
			await this.loadTemplates();
		} catch (error) {
			this.showToast('Error', error?.body?.message || 'Failed to update template activation.', 'error');
		} finally {
			this.isLoading = false;
		}
	}

	showToast(title, message, variant) {
		this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
	}
}