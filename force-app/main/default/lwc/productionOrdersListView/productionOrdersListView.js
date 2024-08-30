import { wire } from 'lwc';
import LwcBase from "c/lwcBase";
import getProductionOrders
	from "@salesforce/apex/ProductionOrderListViewCtrl.getProductionOrders";

export default class ProductionOrdersListView extends LwcBase {

	// this is needed for the refresh apex
	productOrdersWiredResult;

	@wire(
		getProductionOrders,{

		})
	wiredProductOrders(wiredResult) {
		const { data, error } = wiredResult;
		if (data) {
			this.productOrdersWiredResult = wiredResult;
		} else if (error)
			console.error(error);
	}
}