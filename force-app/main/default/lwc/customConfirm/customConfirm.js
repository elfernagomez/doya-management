import LightningModal from 'lightning/modal';
import { api } from "lwc";

export default class CustomConfirm extends LightningModal {
	@api
	title;

	@api
	content;

	@api
	size = "small";

	@api
	buttons = [{
		name: "cancel",
		label: "Cancel",
		variant: ""
	}, {
		name: "ok",
		label: "Ok",
		variant: "brand"
	}];

	handleOnActionClick(event) {
		const btn = this.buttons.find(b => b.name == event.target.name);
		this.close(btn);
	}
}