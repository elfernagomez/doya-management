import { LightningElement, api } from 'lwc';

export default class Panel extends LightningElement {
	@api
	title;

	handleCloseClick() {
		this.dispatchEvent(new CustomEvent('panelclose'));
	}
}