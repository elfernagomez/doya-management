import { api } from "lwc";
import LightningModal from 'lightning/modal';

export default class NewWorkOrdersModal extends LightningModal {
	@api
	orderId;
	
	@api
	orderProductId;

	isComplete = false;

	handleOnCancelClick() {
		this.close();
	}

	handleOnSubmitClick() {
		this.template.querySelector("c-new-work-orders").handleOnSubmitClick();
	}

	handleOnComplete() {
		this.isComplete = true;
	}
}