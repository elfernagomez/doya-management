import { api, LightningElement } from 'lwc';

export default class Badge extends LightningElement {
	@api
	iconPosition = "left"; // left, right, both

	get isIconStart() {
		return this.iconPosition == "left" ||
			this.iconPosition == "both";
	}

	get isIconEnd() {
		return this.iconPosition == "right" ||
			this.iconPosition == "both";
	}
}