import LightningModal from 'lightning/modal';
import { api } from 'lwc';

export default class WorkOrderCompleteStepModal extends LightningModal {
	@api
	currentItem;

	@api
	nextItem;

	@api
	action = "completeStep"; // completeStep, setAsCurrentStep

	completeWorkOrder = true;

	get isActionCompleteStep() {
		return this.action == "completeStep";
	}

	get isActionSetAsCurrentStep() {
		return this.action == "setAsCurrentStep";
	}

	get showMarkWorkOrderAsCompleted() {
		// if there is a next item, then we are not marking the work order as completed
		return this.isActionCompleteStep && this.nextItem == null;
	}

	handleOnCompleteClick() {
		// Do something like calling Apex, updating record, etc.
		this.close({
			confirmed: true,
			completeWorkOrder:
				this.showMarkWorkOrderAsCompleted &&
				this.completeWorkOrder
		});
	}

	handleOnCancelClick() {
		this.close({
			confirmed: false,
			completeWorkOrder: false
		});
	}

	handleOnCompleteWorkOrderChange(event) {
		this.completeWorkOrder = event.target.checked;
	}
}
