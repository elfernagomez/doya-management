import LwcBase from 'c/lwcBase';
import { api } from 'lwc';

/**
 * @author Fernando Gomez
 * @since 3/28/2023
 * @versino 1.0
 */
export default class WorkOrderLineItemManager extends LwcBase {
	@api
	recordId;

	@api
	details = {
		items: [],
		deletedIds: []
	};

	isReady = true;

	get title() {
		return `Steps`;
	}

	get subtitle() {
		return ``;
	}
}