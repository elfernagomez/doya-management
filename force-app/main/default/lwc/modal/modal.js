import { LightningElement, track, api } from 'lwc';


/**
 * @author Fernando Gomez, SkyPlanner LLC
 * @version 1.0
 */
export default class Modal extends LightningElement {
	@track
	isOpen;

	@api
	headerHidden;

	@api
	footerHidden;

	onCloseClick(e) {
		this.close();
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
}