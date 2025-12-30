import { LightningElement, api } from 'lwc';

export default class StatusIndicator extends LightningElement {
	@api status;

	get icon() {
		switch (this.status?.toLowerCase()) {
			case 'completed':
				return {
					name: 'utility:check',
					variant: 'success'
				};
			case 'pending':
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
				return {
					name: 'utility:error',
					variant: 'error'
				};
			default:
				return null;
		}
	}
}