/**
 * Opportunity clone helper. Clones related Delivery Groups and Opportunity Products.
 */
public with sharing class CloneOpportunityRelatedRecordsInvocable {

	@InvocableMethod(
		label='Clone Related Records'
		description='Clones related Delivery Groups and Opportunity Products.'
		category='Opportunity'
	)
	public static List<CloneOpportunityRelatedRecordsWrapper> cloneOpportunityRelatedRecords(
		List<CloneOpportunityRelatedRecordsWrapper> targetAndSourceWrapper
	) {
		if (targetAndSourceWrapper == null || targetAndSourceWrapper.isEmpty()) {
			return new List<CloneOpportunityRelatedRecordsWrapper>();
		}

		List<Opportunity> targetOpportunities = new List<Opportunity>();
		List<Opportunity> sourceOpportunities = new List<Opportunity>();
		Map<Id, Opportunity> sourceOpportunitiesMap;
		Set<Id> sourceIds = new Set<Id>();

		for (CloneOpportunityRelatedRecordsWrapper wrapper : targetAndSourceWrapper) {
			if (wrapper != null && wrapper.targetOpportunity != null && wrapper.targetOpportunity.getCloneSourceId() != null) {
				sourceIds.add(wrapper.targetOpportunity.getCloneSourceId());
			}
		}

		if (sourceIds.isEmpty()) {
			return targetAndSourceWrapper;
		}

		sourceOpportunitiesMap = new Map<Id, Opportunity>([
			SELECT Id
			FROM Opportunity
			WHERE Id IN :sourceIds
		]);

		for (CloneOpportunityRelatedRecordsWrapper wrapper : targetAndSourceWrapper) {
			if (wrapper == null || wrapper.targetOpportunity == null) {
				continue;
			}

			Id sourceId = wrapper.targetOpportunity.getCloneSourceId();
			if (sourceId != null && sourceOpportunitiesMap.containsKey(sourceId)) {
				targetOpportunities.add(wrapper.targetOpportunity);
				sourceOpportunities.add(sourceOpportunitiesMap.get(sourceId));
			}
		}

		if (!targetOpportunities.isEmpty()) {
			DeliveryGroupCloneService.cloneOpportunityDeliveryGroupsAndItems(targetOpportunities, sourceOpportunities);
		}

		return targetAndSourceWrapper;
	}

	public class CloneOpportunityRelatedRecordsWrapper {
		@InvocableVariable(required=true)
		public Opportunity targetOpportunity;
	}
}
