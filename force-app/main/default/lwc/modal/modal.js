import { LightningElement, track, api } from 'lwc';

/**
 * @author Fernando Gomez
 * @version 1.0
 */
export default class Modal extends LightningElement {
	@track
	isOpen = false;

	@api
	headerHidden = false;

	@api
	footerHidden = false;

	@api
	closeButtonHidden = false;

	@api
	size; // small | medium | large | full

	get showCloseButton() {
		return !this.closeButtonHidden;
	}

	onCloseClick(e) {
		this.close();
	}

	@api
	isModalOpen() {
		return this.isOpen;
	}

	@api
	open() {
		this.isOpen = true;
		this.dispatchEvent(new CustomEvent('modalopen'));
	}

	@api
	close() {
		this.isOpen = false;
		this.dispatchEvent(new CustomEvent('modalclose'));
	}

	get modalClass() {
		switch(this.size) {
			case "small":
				return "slds-modal slds-fade-in-open slds-modal_small";
			case "large":
				return "slds-modal slds-fade-in-open slds-modal_large";
			case "full":
				return "slds-modal slds-fade-in-open slds-modal_full";
			case "medium":
				return "slds-modal slds-fade-in-open slds-modal_medium"
			default:
				return "slds-modal slds-fade-in-open";
		}
	}
}