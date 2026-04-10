import { LightningElement, api } from 'lwc';

export default class ExpandableSection extends LightningElement {
	@api heading;
	isOpen = true;

	get sectionClass() {
		return this.isOpen ? 'slds-section slds-is-open' : 'slds-section';
	}

	get ariaExpanded() {
		return this.isOpen ? 'true' : 'false';
	}

	get ariaHidden() {
		return this.isOpen ? 'false' : 'true';
	}

	get displayHeading() {
		return this.heading || 'Section';
	}

	handleToggle() {
		this.isOpen = !this.isOpen;
	}
}
