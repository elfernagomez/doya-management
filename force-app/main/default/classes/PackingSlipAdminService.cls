public with sharing class PackingSlipAdminService {
	public static List<PackingSlipDataModels.TemplateDefinition> listSubscriberTemplates(String providerKey) {
		List<PackingSlipDataModels.TemplateDefinition> templates = new List<PackingSlipDataModels.TemplateDefinition>();
		for (PackingSlipDataModels.TemplateDefinition templateDefinition :
			PackingSlipTemplateRepository.getSubscriberTemplates()) {
			if (String.isBlank(providerKey) || templateDefinition.providerKey == providerKey)
				templates.add(templateDefinition);
		}
		return templates;
	}

	public static void setTemplateActive(Id templateId, Boolean isActive) {
		if (templateId == null)
			throw new AuraHandledException('A template Id is required.');

		PackingSlipTemplateOverride__c templateRecord = [
			SELECT Id, Provider_Key__c, Output_Mode__c, Is_Active__c
			FROM PackingSlipTemplateOverride__c
			WHERE Id = :templateId
			LIMIT 1
		];

		List<PackingSlipTemplateOverride__c> recordsToUpdate = new List<PackingSlipTemplateOverride__c>();
		if (isActive == true) {
			for (PackingSlipTemplateOverride__c sibling : [
				SELECT Id, Is_Active__c
				FROM PackingSlipTemplateOverride__c
				WHERE Provider_Key__c = :templateRecord.Provider_Key__c
				AND Output_Mode__c = :templateRecord.Output_Mode__c
				AND Id != :templateRecord.Id
			]) {
				sibling.Is_Active__c = false;
				recordsToUpdate.add(sibling);
			}
		}

		templateRecord.Is_Active__c = isActive;
		recordsToUpdate.add(templateRecord);
		update recordsToUpdate;
	}
}