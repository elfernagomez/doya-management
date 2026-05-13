import ProductManagerBase from 'c/productManagerBase';
import { api } from 'lwc';;

export default class DiscountManager extends ProductManagerBase {
	@api
	priceBookId = null;

	@api
	hideAddDiscounts = false;

	selectedDiscountId = null;

	discountFilter = {
		criteria: [{
			fieldPath: "IsActive",
			operator: "eq",
			value: true
		}, {
			fieldPath: "RecordType.DeveloperName",
			operator: "eq",
			value: "Discount"
		}],
		filterLogic: '1 AND 2'
	};
}