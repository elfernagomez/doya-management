import { LightningElement } from 'lwc';
import OrderImportToolModal from 'c/orderImportToolModal';

export default class OrderImportToolLauncher extends LightningElement {
	isOpening = false;

	async handleOpenModal() {
		if (this.isOpening)
			return;

		this.isOpening = true;
		try {
			await OrderImportToolModal.open({
				size: 'small',
				description: 'Import orders and order products from CSV.'
			});
		} finally {
			this.isOpening = false;
		}
	}
}
