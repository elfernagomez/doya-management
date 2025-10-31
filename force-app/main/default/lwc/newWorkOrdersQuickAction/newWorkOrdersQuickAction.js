import LwcBase from 'c/lwcBase';
import { api } from 'lwc';
import { CloseActionScreenEvent } from 'lightning/actions';

export default class NewWorkOrdersQuickAction extends LwcBase {
	@api
	recordId;
	
	isComplete = false;

	handleOnCancelClick() {
		this.dispatchEvent(new CloseActionScreenEvent());
	}

	handleOnSubmitClick() {
		this.getComponent("c-new-work-orders").handleOnSubmitClick();
	}

	handleOnComplete() {
		this.isComplete = true;
	}
}