import { LightningElement, api } from 'lwc';
import FONT_AWESOME_SPRITES from "@salesforce/resourceUrl/font_awesome_sprites";

export default class FontAwesomeIcon extends LightningElement {
	@api
	iconName; // eg: solid:credit-card, regular:building-columns, brand:java

	@api
	alternativeText;

	@api
	size = "medium";

	@api
	variant = "default";

	get iconUrl() {
		let parts = this.iconName?.split(':') || [];
		return `${FONT_AWESOME_SPRITES}/${parts[0]}.svg#${parts[1]}`;
	}

	get containerClass() {
		switch (this.variant) {
			case "inherit":
				return "slds-icon_container slds-current-color";
			case "default":
			case "success":
			case "warning":
			case "error":
			case "light":
			default:
				return "slds-icon_container";
		}
	}

	get svgClass() {
		return `slds-icon ${this.colorClass} ${this.sizeClass}`;
	}

	get colorClass() {
		switch (this.variant) {
			case "default":
				return "slds-icon-text-default";
			case "success":
				return "slds-icon-text-success";
			case "warning":
				return "slds-icon-text-warning";
			case "error":
				return "slds-icon-text-error";
			case "light":
				return "slds-icon-text-light";
			case "inherit":
			default:
				return "";
		}
	}

	get sizeClass() {
		switch (this.size) {
			case "xx-small":
				return "slds-icon_xx-small";
			case "x-small":
				return "slds-icon_x-small";
			case "small":
				return "slds-icon_small";
			case "medium":
				return "slds-icon_medium";
			case "large":
			default:
				return "slds-icon_large";
		}
	}
}