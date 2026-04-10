import { LightningElement, api } from 'lwc';

const getIconByStatus = (status) => {
	switch ((status || '').toLowerCase()) {
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
			return {
				name: 'utility:question',
				variant: ''
			};
	}
};

export { getIconByStatus };

export default class StatusIndicator extends LightningElement {
	@api status;

	get variant() {
		return getIconByStatus(this.status)?.variant || 'default';
	}

	get icon() {
		return getIconByStatus(this.status);
	}
}