import LightningModal from 'lightning/modal';
import { api, wire } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { getLayout } from 'lightning/uiLayoutApi';
import PACKING_SLIP_OBJECT from '@salesforce/schema/PackingSlip__c';

export default class PackingSlipCreateModal extends LightningModal {
	@api recordId;
	@api mode = 'create';
	@api orderId;
	@api deliveryGroupId;
	@api defaultValues = {};

	recordTypeId;
	objectFields = {};
	sections = [];
	errorMessage;

	@wire(getObjectInfo, { objectApiName: PACKING_SLIP_OBJECT })
	wiredObjectInfo({ data }) {
		if (data) {
			this.recordTypeId = data.defaultRecordTypeId;
			this.objectFields = data.fields || {};
		}
	}

	@wire(getLayout, {
		objectApiName: PACKING_SLIP_OBJECT,
		layoutType: 'Full',
		mode: 'Edit',
		recordTypeId: '$recordTypeId'
	})
	wiredLayout({ data, error }) {
		if (data) {
			this.sections = this.normalizeSections(data.sections || []);
			this.errorMessage = null;
		} else if (error) {
			this.sections = [];
			this.errorMessage = 'Failed to load Packing Slip layout.';
		}
	}

	get isEditMode() {
		return this.mode === 'edit' || !!this.recordId;
	}

	get modalTitle() {
		return this.isEditMode ? 'Edit Packing Slip' : 'New Packing Slip';
	}

	get mergedDefaultValues() {
		if (this.isEditMode)
			return {};

		const defaults = {
			...(this.defaultValues || {})
		};

		if (this.orderId)
			defaults.Order__c = this.orderId;

		if (this.deliveryGroupId)
			defaults.DeliveryGroup__c = this.deliveryGroupId;

		return defaults;
	}

	normalizeSections(layoutSections) {
		return (layoutSections || [])
			.map((section, sectionIndex) => {
				const rows = (section.layoutRows || [])
					.map((row, rowIndex) => {
						const items = (row.layoutItems || [])
							.map((item, itemIndex) => {
								const fieldApiNames = (item.layoutComponents || [])
									.map(component => component.apiName)
									.filter(Boolean);

								if (!fieldApiNames.length)
									return null;

								const fields = fieldApiNames.map((fieldApiName, fieldIndex) => {
									const isReadOnly = this.isFieldReadOnly(fieldApiName, item);
									return {
										key: `section-${sectionIndex}-row-${rowIndex}-item-${itemIndex}-field-${fieldIndex}`,
										apiName: fieldApiName,
										defaultValue: this.isEditMode ? undefined : this.mergedDefaultValues[fieldApiName],
										isReadOnly,
										isRequired: !!item.required && !isReadOnly,
										useOutputField: isReadOnly,
										useInputField: !isReadOnly
									};
								});

								return {
									key: `section-${sectionIndex}-row-${rowIndex}-item-${itemIndex}`,
									fields
								};
							})
							.filter(Boolean);

						if (!items.length)
							return null;

						return {
							key: `section-${sectionIndex}-row-${rowIndex}`,
							items
						};
					})
					.filter(Boolean);

				if (!rows.length)
					return null;

				return {
					key: `section-${sectionIndex}`,
					displayHeading: section.heading || `Section ${sectionIndex + 1}`,
					rows
				};
			})
			.filter(Boolean);
	}

	isFieldReadOnly(fieldApiName, layoutItem) {
		const fieldMeta = this.objectFields[fieldApiName] || {};
		const editableByLayout = this.isEditMode ? layoutItem?.editableForUpdate !== false : layoutItem?.editableForNew !== false;
		const editableByFls = this.isEditMode ? !!fieldMeta.updateable : !!fieldMeta.createable;

		return !!fieldMeta.calculated ||
			!!fieldMeta.autoNumber ||
			!editableByLayout ||
			!editableByFls;
	}

	get hasSections() {
		return this.sections.length > 0;
	}

	handleSubmit(event) {
		event.preventDefault();
		const fields = this.isEditMode ?
			{ ...event.detail.fields } :
			{
				...this.mergedDefaultValues,
				...event.detail.fields
			};

		this.template.querySelector('lightning-record-edit-form').submit(fields);
	}

	handleSave() {
		this.template.querySelector('lightning-record-edit-form')?.submit();
	}

	getFieldLabel(fieldApiName) {
		return this.objectFields[fieldApiName]?.label ||
			fieldApiName?.replace(/__c$/i, '').replace(/_/g, ' ') ||
			fieldApiName;
	}

	toDisplayMessage(message) {
		if (!message)
			return message;

		const bracketedFieldList = message.match(/\[([^\]]+)\]/);
		if (!bracketedFieldList)
			return message;

		const apiNames = bracketedFieldList[1]
			.split(',')
			.map(name => name.trim())
			.filter(Boolean);
		if (!apiNames.length)
			return message;

		const labels = apiNames.map(fieldApiName => this.getFieldLabel(fieldApiName));
		return message.replace(bracketedFieldList[0], labels.join(', '));
	}

	handleError(event) {
		const detail = event?.detail || {};
		const output = detail.output || {};
		const fieldErrors = output.fieldErrors || {};
		const pageErrors = output.errors || [];

		const firstFieldError = Object.values(fieldErrors)
			.flat()
			.find(error => error?.message)?.message;
		const firstPageError = pageErrors.find(error => error?.message)?.message;

		this.errorMessage = this.toDisplayMessage(firstFieldError) ||
			this.toDisplayMessage(firstPageError) ||
			this.toDisplayMessage(detail.detail) ||
			this.toDisplayMessage(detail.message) ||
			firstPageError ||
			detail.detail ||
			detail.message ||
			'Unable to save Packing Slip.';
	}

	handleSuccess(event) {
		this.close({
			status: 'saved',
			recordId: event.detail.id,
			mode: this.isEditMode ? 'edit' : 'create'
		});
	}

	handleCancel() {
		this.close({
			status: 'cancelled'
		});
	}
}
