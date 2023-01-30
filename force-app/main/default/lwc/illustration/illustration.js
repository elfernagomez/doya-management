import { LightningElement, api } from 'lwc';

export default class Illustration extends LightningElement {
	@api
	type = "desert";

	get isDesert() {
		return this.type == "desert";
	}
}