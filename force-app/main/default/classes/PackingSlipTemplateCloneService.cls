public with sharing class PackingSlipTemplateCloneService {
	public static Id cloneDefaultToSubscriber(String templateKey) {
		if (String.isBlank(templateKey))
			throw new AuraHandledException('A template key is required to clone a default template.');

		PackingSlipDataModels.TemplateDefinition templateDefinition =
			PackingSlipTemplateRepository.getPackagedTemplate(templateKey);
		if (templateDefinition == null)
			throw new AuraHandledException('No packaged template was found for key ' + templateKey + '.');
		String dimensions = String.isBlank(templateDefinition.dimensions) ?
			'LETTER_8_5X11' :
			templateDefinition.dimensions;

		List<PackingSlipTemplateOverride__c> existingTemplates = [
			SELECT Id
			FROM PackingSlipTemplateOverride__c
			WHERE Template_Key__c = :templateDefinition.templateKey
			AND Output_Mode__c = :templateDefinition.outputMode
			AND Dimensions__c = :dimensions
			AND Provider_Key__c = :templateDefinition.providerKey
			LIMIT 1
		];

		if (!existingTemplates.isEmpty())
			return existingTemplates[0].Id;

		PackingSlipTemplateOverride__c subscriberTemplate = new PackingSlipTemplateOverride__c(
			Name = templateDefinition.name,
			Template_Key__c = templateDefinition.templateKey,
			Template_Type__c = templateDefinition.templateType,
			Output_Mode__c = templateDefinition.outputMode,
			Dimensions__c = dimensions,
			Provider_Key__c = templateDefinition.providerKey,
			Is_Active__c = false,
			Body__c = templateDefinition.body,
			Subscriber_Override__c = true,
			Description__c = templateDefinition.description
		);
		insert subscriberTemplate;
		return subscriberTemplate.Id;
	}
}