import LightningModal from 'lightning/modal';
import { api } from 'lwc';

export default class PackingSlipItemEditorModal extends LightningModal {
	@api packingSlipId;

	handleClose() {
		this.close('cancelled');
	}

	handleItemsSaved() {
		// Close modal and notify parent that items were saved
		this.close('saved');
	}
}
