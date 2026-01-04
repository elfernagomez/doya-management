import { LightningElement, api } from 'lwc';

export default class StatusIndicator extends LightningElement {
	@api status;

	get variant() {

		switch ((this.status || '').toLowerCase()) {
			case 'completed':
				return 'success';
			case 'pending':
			case 'new':
			case 'on hold':
			case 'on_hold':
				return 'info';
			case 'in progress':
			case 'in_progress':
				return 'warning';
			case 'error':
			case 'canceled':
			case 'rejected':
				return 'error';
			default:
				return 'default';
		}
	}

	get icon() {
		switch ((this.status || '').toLowerCase()) {
			case 'completed':
				return {
					name: 'utility:check',
					variant: 'success'
				};
			case 'pending':
			case 'new':
			case 'on hold':
			case 'on_hold':
				return {
					name: 'utility:clock',
					variant: 'info'
				};
			case 'in progress':
			case 'in_progress':
				return {
					name: 'utility:threedots',
					variant: 'warning'
				};
			case 'error':
			case 'canceled':
			case 'rejected':
				return {
					name: 'utility:error',
					variant: 'error'
				};
			default:
				return null;
		}
	}
}