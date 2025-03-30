import { api, wire, track } from 'lwc';
import LwcBase from 'c/lwcBase';
import { getRelatedListRecords } from 'lightning/uiRelatedListApi';

import {
	getFieldApiNames,
	convertFromRecord
} from "c/orderProductManager";

export default class NewWorkOrders extends LwcBase {
	@api
	recordId;

	@track
	productGroups = [];

	fieldApiNames = [];

	connectedCallback() {
		this.fieldApiNames = getFieldApiNames();
	}

	@wire(getRelatedListRecords, {
		parentRecordId: "$recordId",
		relatedListId: "OrderItems",
		fields: "$fieldApiNames"
	})
	listInfo({ error, data }) {
		if (data) {
			const mapped = {};
			data.records.forEach(r => {
				let item = convertFromRecord(r);
				let key = [
					item.productCode,
					item.unitType,
					item.width,
					item.height,
					item.depth
				].join(":");

				if (mapped[key]) {
					// key added, increa qty and add the item
					mapped[key].qty += item.qty;
					mapped[key].items.push(item);
				} else {
					// first time adding the key
					mapped[key] = {
						...item,
						items: [item],
						sopId: null
					};
				}
			});

			// we convert the mapp to an array
			this.productGroups = Object.values(mapped);
		} else if (error) {
			this.addError("Error fetching Order Products", error);
		}
	}
}