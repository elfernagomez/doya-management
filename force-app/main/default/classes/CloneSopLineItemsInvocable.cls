/**
 * Clones SOP Line Items from source SOPs to target SOPs.
 * @author Fernando Gomez
 * @version 1.0 12/13/2025
 */
public with sharing class CloneSopLineItemsInvocable {

	/**
	 * @return the same list of wrappers for reference
	 * @param sopWrappers List of wrappers containing target SOPs
	 */
	@InvocableMethod(
		label='Clone SOP Line Items'
		description='Clones SOP Line Items from the source SOP to the target SOP.'
		category='SOP'
	)
	public static List<CloneSopLineItemsWrapper> cloneSopLineItems(
		List<CloneSopLineItemsWrapper> sopWrappers
	) {
		List<SOP__c> targetSops = new List<SOP__c>();
		Map<Id, SOP__c> sourceSopsMap = new Map<Id, SOP__c>();
		Set<Id> sourceIds = new Set<Id>();

		// Collect all source IDs
		for (CloneSopLineItemsWrapper wrapper : sopWrappers) {
			if (wrapper.targetSop.getCloneSourceId() != null) {
				sourceIds.add(wrapper.targetSop.getCloneSourceId());
			}
		}

		// Query source SOPs with their line items
		if (!sourceIds.isEmpty()) {
			// Get all fields for SopLineItem__c
			String lineItemFields = String.join(
				new List<String>(Schema.SObjectType.SopLineItem__c.fields.getMap().keySet()), 
				', '
			);
			
			String soqlQuery = 'SELECT Id, (SELECT ' + lineItemFields + ' FROM SopLineItems__r) FROM SOP__c WHERE Id IN :sourceIds';
			
			for (SOP__c sourceSop : Database.query(soqlQuery)) {
				sourceSopsMap.put(sourceSop.Id, sourceSop);
			}
		}

		// Prepare line items to clone
		List<SopLineItem__c> lineItemsToInsert = new List<SopLineItem__c>();

		for (CloneSopLineItemsWrapper wrapper : sopWrappers) {
			Id sourceId = wrapper.targetSop.getCloneSourceId();
			
			if (sourceId != null && sourceSopsMap.containsKey(sourceId)) {
				SOP__c sourceSop = sourceSopsMap.get(sourceId);
				
				// Clone each line item
				if (sourceSop.SopLineItems__r != null) {
					for (SopLineItem__c sourceLineItem : sourceSop.SopLineItems__r) {
						SopLineItem__c clonedLineItem = sourceLineItem.clone(false, true, false, false);
						clonedLineItem.SOP__c = wrapper.targetSop.Id;
						lineItemsToInsert.add(clonedLineItem);
					}
				}
			}
		}

		// Insert cloned line items
		if (!lineItemsToInsert.isEmpty()) {
			insert lineItemsToInsert;
		}

		return sopWrappers;
	}

	public class CloneSopLineItemsWrapper {
		@InvocableVariable(required=true label='Target SOP')
		public SOP__c targetSop;
	}
}
