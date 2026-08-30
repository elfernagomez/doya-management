import LwcBase from 'c/lwcBase';
import { api } from 'lwc';

export default class PageHeader extends LwcBase {
	@api
	iconName = "utility:sobject";
	
	@api
	title;
	
	@api
	subtitle;

	@api
	listViews = [];

	@api
	selectedListView;

	@api
	actions = [];

	@api
	numberOfVisibleActions = 3;

	@api
	searchText;

	@api
	isForListView = false;

	@api
	isFilterListOpen = false;

	get mainClass() {
		const result = [
			"slds-page-header"
		];

		if (this.isForListView)
			result.push(
				"slds-page-header_joined",
				"slds-page-header_bleed"
			);

		return result.join(" ");
	}

	get visibleActions() {
		return this.numberOfVisibleActions >= this.actions.length ?
			this.actions :
			this.actions.slice(0, this.numberOfVisibleActions);
	}

	get invisibleActions() {
		return this.numberOfVisibleActions >= this.actions.length ?
			null :
			this.actions.slice(this.numberOfVisibleActions);
	}

	get filterListButtonVariant() {
		return this.isFilterListOpen ? "brand" : "border-filled";
	}

	handleOnActionButtonClick(event) {
		const action = this.actions.find(a => a.name == event.target.dataset.name);
		this.customEvent("actionselect", { ...action });
	}

	handleOnActionSelect(event) {
		const action = this.actions.find(a => a.name == event.detail.value);
		this.customEvent("actionselect", { ...action });
	}

	handleOnLisViewButtonClick(event) {
		const actionName = event.target.dataset.name;
		this.customEvent("listviewbuttonclick", { actionName });
	}

	handleOnSearchTextChange(event) {
		const value = event.target.value;
		this.customEvent("searchtextchange", { value });
	}

	handleOnSearchTextFocus(event) {
		const value = event.target.value;
		this.customEvent("searchtextfocus", { value });
	}

	handleOnSearchTextBlur(event) {
		const value = event.target.value;
		this.customEvent("searchtextblur", { value });
	}
}