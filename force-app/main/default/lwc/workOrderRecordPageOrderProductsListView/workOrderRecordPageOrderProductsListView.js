import { api, wire } from 'lwc';
import LwcBase from 'c/lwcBase';

import { convertFromApexRecord } from 'c/orderProductManager';
import { createGroupFromApexRecord } from "c/deliveryGroupCard";

import getDeliveryGroupsByWorkOrder
	from "@salesforce/apex/DeliveryGroupManager.getDeliveryGroupsByWorkOrder";

export default class WorkOrderRecordPageOrderProductsListView extends LwcBase {
	@api
	recordId;

	groups = [];
	workOrderIds;

	connectedCallback() {
		this.workOrderIds = [this.recordId];
	}

	@wire(getDeliveryGroupsByWorkOrder, {
		workOrderId: "$recordId"
	})
	wiredOrderItemRecords({ data, error }) {
		if (data) {
			this.groups = data.map(r => ({
				...createGroupFromApexRecord(r),
				products: r.OrderProducts__r?.map(
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