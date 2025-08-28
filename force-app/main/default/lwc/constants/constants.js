import NO_ITEMS_MSG
	from "@salesforce/label/c.lineItemManager_noItemsMsg";
import ADD_ITEM_BTN
	from "@salesforce/label/c.lineItemManager_addItemBtn";
import DELETE_ITEM_BTN
	from "@salesforce/label/c.lineItemManager_deleteItemBtn";
import PROCEDURE_FIELD_LABEL
	from "@salesforce/label/c.lineItemManager_procedureFieldLabel";
import SHOW_ITEMS_NOTES_BTN
	from "@salesforce/label/c.lineItemManager_showItemsNotesBtn";
import HIDE_ITEMS_NOTES_BTN
	from "@salesforce/label/c.lineItemManager_hideItemsNotesBtn";
import NOTES_FIELD_LABEL
	from "@salesforce/label/c.lineItemManager_notesFieldLabel";
import ORDER_ITEM_BTN
	from "@salesforce/label/c.lineItemManager_orderItemBtn";
import MARK_AS_COMPLETED_BTN
	from "@salesforce/label/c.lineItemManager_markAsCompletedBtn";

import FIELD_MULTI_SELECTOR_DEFAULT_TITLE
	from "@salesforce/label/c.fieldMultiSelector_defaultTitle";
import FIELD_MULTI_SELECTOR_ALLOW_EDIT_HELP_TEXT
	from "@salesforce/label/c.fieldMultiSelector_allowEditHelp";

import PROCEDURE_EXTRA_FIELDS_SELECTOR_TITLE
	from "@salesforce/label/c.procedureExtraFieldsSelector_title";

import WORK_ORDER_LIST_VIEW_SET_ALL_AS_CURRENT_STEP_TITLE
	from "@salesforce/label/c.WorkOrderListView_setAllAsCurrentStepTitle";
import WORK_ORDER_LISTVIEW_SET_ALL_AS_CURRENT_STEP_MESSAGE
	from "@salesforce/label/c.WorkOrderListView_setAllAsCurrentStepMessage";
import WORK_ORDER_LIST_VIEW_COMPLETE_ALL_STEPS_TITLE
	from "@salesforce/label/c.WorkOrderListView_completeAllStepsTitle";
import WORK_ORDER_LIST_VIEW_COMPLETE_ALL_STEPS_MESSAGE
	from "@salesforce/label/c.WorkOrderListView_completeAllStepsMessage";

export const lineItemManagerLabels = {
	noItemsMsg: NO_ITEMS_MSG,
	addItemBtn: ADD_ITEM_BTN,
	deleteItemBtn: DELETE_ITEM_BTN,
	procedureFieldLabel: PROCEDURE_FIELD_LABEL,
	showItemsNotesBtn: SHOW_ITEMS_NOTES_BTN,
	hideItemsNotesBtn: HIDE_ITEMS_NOTES_BTN,
	notesFieldLabel: NOTES_FIELD_LABEL,
	orderItemBtn: ORDER_ITEM_BTN,
	markAsCompletedBtn: MARK_AS_COMPLETED_BTN
};

export const fieldMultiSelectorLabels = {
	defaultTitle: FIELD_MULTI_SELECTOR_DEFAULT_TITLE,
	allowEditHelp: FIELD_MULTI_SELECTOR_ALLOW_EDIT_HELP_TEXT
};

export const procedureConfigurationLabels = {
	title: PROCEDURE_EXTRA_FIELDS_SELECTOR_TITLE
};

export const workOrderListViewLabels = {
	setAllAsCurrentStepMessage: WORK_ORDER_LISTVIEW_SET_ALL_AS_CURRENT_STEP_MESSAGE,
	setAllAsCurrentStepTitle: WORK_ORDER_LIST_VIEW_SET_ALL_AS_CURRENT_STEP_TITLE,
	completeAllStepsTitle: WORK_ORDER_LIST_VIEW_COMPLETE_ALL_STEPS_TITLE,
	completeAllStepsMessage: WORK_ORDER_LIST_VIEW_COMPLETE_ALL_STEPS_MESSAGE,
};