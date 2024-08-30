import { api, LightningElement } from 'lwc';

export default class ErrorPanel extends LightningElement {
	@api
	errorTitle = ["Oops. There was an unexpected issue.",
		"Please, Provide the following information to an administrator."
	].join(" ");

	@api
	errorObject;

	@api
	variant = "confy"; // confy, compact

	showDetails = false;

	get isConfy() {
		return this.variant == "confy";
	}

	get isCompact() {
		return this.variant == "compact";
	}

	get showErrorDetailsPanel() {
		return this.errorObject != null;
	}

	get errorJson() {
		return this.errorObject ?
			(typeof this.errorObject == 'string' ?
				this.errorObject :
				JSON.stringify(this.errorObject, null, 2)) :
			null;
	}

	handleToggleDetails(event) {
		if (event.preventDefault)
			event.preventDefault();
		this.showDetails = !this.showDetails;
	}
}