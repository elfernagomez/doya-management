import { api, wire } from 'lwc';
import LwcBase from 'c/lwcBase';

import { convertFromApexRecord } from 'c/orderProductManager';

import getOrderAndOrderItemsByWorkOrder
	from "@salesforce/apex/OrderManager.getOrderAndOrderItemsByWorkOrder";

export default class WorkOrderRecordPageOrderProductsListView extends LwcBase {
	@api
	recordId;

	orders = [];
	workOrderIds;

	connectedCallback() {
		this.workOrderIds = [this.recordId];
	}

	@wire(getOrderAndOrderItemsByWorkOrder, {
		workOrderId: "$recordId"
	})
	wiredOrderItemRecords({ data, error }) {
		if (data) {
			this.orders = data.map(r => ({
				uniqueId: r.Id,
				products: r.OrderItems?.map(
					op => convertFromApexRecord(op)) || []
			}));
		} else if (error) {
			this.addError(
				[
					"We encountered an issue while retrieving the Order Products",
					...this.getDmlErrors(error)
				].join(". "),
				error);
		}
	}
}