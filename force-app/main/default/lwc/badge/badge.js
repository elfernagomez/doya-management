import { api, LightningElement } from 'lwc';

export default class Badge extends LightningElement {
	@api
	iconPosition = "left"; // left, right, both

	@api
	variant = "default"; // default, success, warning, error, info

	get isIconStart() {
		return this.iconPosition == "left" ||
			this.iconPosition == "both";
	}

	get isIconEnd() {
		return this.iconPosition == "right" ||
			this.iconPosition == "both";
	}

	get badgeClass() {
		let classes = "slds-badge ";

		switch (this.variant) {
			case "success":
				classes += "slds-theme_success ";
				break;
			case "warning":
				classes += "slds-theme_warning ";
				break;
			case "error":
				classes += "slds-theme_error ";
				break;
			case "info":
				classes += "slds-theme_info ";
				break;
			default:
				classes += " ";
		}

		return classes;
	}
}