import LwcBase from 'c/lwcBase';
import { api } from 'lwc';

/**
 * @author Fernando Gomez
 * @since 4/16/2024
 * @versino 1.0
 */
export default class SopLineItemManager extends LwcBase {
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