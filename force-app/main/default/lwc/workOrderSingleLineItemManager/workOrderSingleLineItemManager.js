import WorkOrderLineItemManagerBase from 'c/workOrderLineItemManagerBase';
import { wire, track, api } from 'lwc';
import {
	getFieldValue,
	getRecord,
	getRecords
} from 'lightning/uiRecordApi';

import {
	applyProcedureRecord,
	applyStatusFlags
} from "c/lineItemManagerStep";

import {
	getProcedureFromRecord,
	getFieldNames
} from "c/procedureConfiguration";

import getAllProcedures from "@salesforce/apex/Procedure.getAll";

export default class WorkOrderSingleLineItemManager
		extends WorkOrderLineItemManagerBase {
	@track
	item;

	@api
	showModeOptions = false;

	mode = "prod";
	wiredProcedureParameter;
	procedureOptions = [];

	get modeOptions() {
		return [{
			label: "Admin",
			value: "admin"
		}, {
			label: "Production",
			value: "prod"
		}];
	}

	@wire(getAllProcedures)
	wiredProcedureOptions({ data, error }) {
		if (data) {
			this.wiredProcedureParameter = data.map(id => ({
				recordIds: [id],
				fields: getFieldNames()
			}));
		} else if (error)
			this.addError("Error retrieving available Procedures", error);
	}

	@wire(getRecords, {
		records: "$wiredProcedureParameter"
	})
	wiredRecords({ error, data }) {
		if (data) {
			this.procedureOptions = data.results.map(
				result => getProcedureFromRecord(result.result));
		} else if (error) {
			console.error("WorkOrderSingleLineItemManager.wiredRecords", error);
		}
	}

	@wire(getRecord, {
		recordId: "$recordId",
		fields: "$fieldApiNames"
	})
	wiredWorkOrderLineItem({ error, data }) {
		if (data) {
			// we got data so, we are ready
			const record = {"Id": data.id};
			const procedureRecord = data.fields.Procedure__r?.value;
			
			// create a one level record with all field values
			this.fields.forEach(f =>
				(record[f] = getFieldValue(data, this.getFieldFullName(f))));
			
			// we convert the record into an item
			this.item = this.getFromRecord(record);
			
			// and apply the procedure
			if (procedureRecord)
				applyProcedureRecord(this.item, procedureRecord);

			applyStatusFlags(this.item);

			// and set the ready status
			this.isReady = true;
		} else if (error)
			this.addError("Error retrieving the Work Order Line Item", error);
	}

	handleModeChange(event) {
		this.mode = event.target.value;
	}
}