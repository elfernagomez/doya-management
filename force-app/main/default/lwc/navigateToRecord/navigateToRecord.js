import { LightningElement, api, wire } from 'lwc';
import {
	IsConsoleNavigation,
	EnclosingTabId,
	getTabInfo,
	openSubtab
} from 'lightning/platformWorkspaceApi';
import { NavigationMixin } from 'lightning/navigation';

export default class NavigateToRecord extends NavigationMixin(LightningElement) {

	@api recordId;
	@api objectApiName;
	@api actionName = 'view';

	@wire(IsConsoleNavigation)
	isConsoleNavigation;

	@wire(EnclosingTabId)
	enclosingTabId;

	@api
	async invoke() {

		if (!this.recordId) {
			throw new Error('A record ID is required for navigation.');
		}

		const isConsole = Boolean(this.isConsoleNavigation?.data);
		if (isConsole) {
			const didConsoleNavigation = await this.navigateInConsole();
			if (didConsoleNavigation) {
				return;
			}
		}

		this.navigateStandard();
	}

	async navigateInConsole() {
		const enclosingTabId = this.enclosingTabId?.data;

		if (!enclosingTabId) {
			return false;
		}

		try {
			const tabInfo = await getTabInfo(enclosingTabId);

		/*
		 * If the Flow is already running inside a subtab,
		 * use its parent workspace tab.
		 *
		 * If it is running in the primary workspace tab,
		 * use the enclosing tab itself.
		 */
			const parentTabId = tabInfo.isSubtab
				? tabInfo.parentTabId
				: tabInfo.tabId;

			if (!parentTabId) {
				return false;
			}

			await openSubtab(parentTabId, {
				recordId: this.recordId,
				focus: true
			});

			return true;
		} catch (e) {
			return false;
		}
	}

	navigateStandard() {

		this[NavigationMixin.Navigate]({
			type: 'standard__recordPage',
			attributes: {
				recordId: this.recordId,
				objectApiName: this.objectApiName,
				actionName: this.actionName
			}
		});
	}
}