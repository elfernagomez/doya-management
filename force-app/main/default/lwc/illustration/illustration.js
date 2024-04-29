import { LightningElement, api } from 'lwc';

export default class Illustration extends LightningElement {
	@api
	isTextOnly = false;

	@api
	action = false;

	@api
	heading;

	@api
	message;

	@api
	variant;

	@api
	imageSize = "small";

	get showIllustration() {
		return !this.isTextOnly;
	}
	
	get illustrationClass() {
		return [
			"slds-illustration",
			this.sizeClass
		].join(" ");
	}
	
	get headingClass() {
		if (this.imageSize == "Large")
			return 'slds-illustration__header slds-text-heading_medium';
		else
			return 'slds-text-heading_medium';
	}

	get sizeClass() {
		switch (this.imageSize) {
			case "large":
				return "slds-illustration_large";
			case "small":
			default:
				return "slds-illustration_small";
		}
	}
}