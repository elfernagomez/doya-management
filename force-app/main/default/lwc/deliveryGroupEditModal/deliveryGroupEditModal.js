import LightningModal from 'lightning/modal';
import { api } from "lwc";

export default class DeliveryGroupEditModal extends LightningModal {
	@api
	recordId;

	@api
	title = "Delivery Group";
}