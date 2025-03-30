import ProductManagerBase from 'c/productManagerBase';
import { api, wire, track } from 'lwc';

/**
 * @author Fernando Gomez
 * @since 10/30.2022
 * @versino 1.0
 */
export default class ProductManager extends ProductManagerBase {
	productFilter = {
		criteria: [{
			fieldPath: "IsActive",
			operator: "eq",
			value: true
		}, {
			fieldPath: "RecordType.DeveloperName",
			operator: "eq",
			value: "Product"
		}],
		filterLogic: '1 AND 2'
	};

	get isList() {
		return this.variant == "list";
	}

	get isCard() {
		return this.variant == "card";
	}
}