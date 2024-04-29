import { LightningElement, api } from 'lwc';

/**
 * Component implemeting Scoped Notification blue print
 * on the lightning design system:
 * https://www.lightningdesignsystem.com/components/scoped-notifications
 * @author Fernando Gomez
 * @version 1.0 6/24/2022
 */
export default class ScopedNotification extends LightningElement {
	@api
	variant = 'info';

	@api
	message;

	@api
	isIconHidden = false;

	@api
	customBackgroundColor;

	get showIcon() {
		return this.isIconHidden != true && this.isIconHidden != "true";
	}

	_baseClasses = [
		"slds-scoped-notification",
		"slds-media"/* ,
		"slds-media_center" */
	];

	get icon() {
		switch (this.variant) {
			case "success":
				return "utility:success";
			case "warning":
				return "utility:warning";
			case "error":
				return "utility:error";
			default:
				return "utility:info";
		}
	}

	get iconVariant() {
		switch (this.variant) {
			case "success":
			case "error":
			case "info-inverse":
				return "inverse";
			case "warning":
			case "info":
			default:
				return "";
		}
	}

	get mainClass() {
		switch (this.variant) {
			case "success":
				return this._baseClasses.concat(
					"slds-theme_success").join(" ");
			case "warning":
				return this._baseClasses.concat(
					"slds-theme_warning").join(" ");
			case "error":
				return this._baseClasses.concat(
					"slds-theme_error").join(" ");
			case "info":
				return this._baseClasses.concat(
					"slds-scoped-notification_light").join(" ");
			case "info-inverse":
				return this._baseClasses.concat(
					"slds-scoped-notification_dark").join(" ");
			default:
				return this._baseClasses;
		}
	}

	get mainStyle() {
		return this.customBackgroundColor ?
			`background-color:${this.customBackgroundColor};` : null;
	}
}