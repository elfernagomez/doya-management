@IsTest
private class PackingSlipTemplateRepositoryTest {
	@IsTest
	static void repository_prefersSubscriberOverrideOverPackagedDefault() {
		PackingSlipDataModels.TemplateDefinition packaged = new PackingSlipDataModels.TemplateDefinition();
		packaged.templateKey = 'DefaultHtml';
		packaged.dimensions = 'LETTER_8_5X11';
		packaged.name = 'Packaged';
		packaged.outputMode = 'SCREEN';
		packaged.providerKey = 'SHIPMENT';
		packaged.isActive = true;
		packaged.source = 'PACKAGED';

		PackingSlipDataModels.TemplateDefinition subscriber = new PackingSlipDataModels.TemplateDefinition();
		subscriber.templateKey = 'DefaultHtml';
		subscriber.dimensions = 'LETTER_8_5X11';
		subscriber.name = 'Subscriber';
		subscriber.outputMode = 'SCREEN';
		subscriber.providerKey = 'SHIPMENT';
		subscriber.isActive = true;
		subscriber.source = 'SUBSCRIBER';

		PackingSlipTemplateRepository.setTestData(
			new List<PackingSlipDataModels.TemplateDefinition>{ subscriber },
			new List<PackingSlipDataModels.TemplateDefinition>{ packaged },
			new List<PackingSlipDataModels.FieldMapDefinition>()
		);

		PackingSlipDataModels.TemplateDefinition resolved =
			PackingSlipTemplateRepository.getTemplate('DefaultHtml', 'SCREEN', 'SHIPMENT');

		System.assertEquals('Subscriber', resolved.name);
		PackingSlipTemplateRepository.clearTestData();
	}

	@IsTest
	static void repository_fallsBackToPackagedDefaultWhenSubscriberMissing() {
		PackingSlipDataModels.TemplateDefinition packaged = new PackingSlipDataModels.TemplateDefinition();
		packaged.templateKey = 'DefaultHtml';
		packaged.dimensions = 'LETTER_8_5X11';
		packaged.templateType = 'HTML';
		packaged.name = 'Packaged HTML';
		packaged.outputMode = 'SCREEN';
		packaged.providerKey = 'SHIPMENT';
		packaged.isActive = true;
		packaged.source = 'PACKAGED';

		PackingSlipTemplateRepository.setTestData(
			new List<PackingSlipDataModels.TemplateDefinition>(),
			new List<PackingSlipDataModels.TemplateDefinition>{ packaged },
			new List<PackingSlipDataModels.FieldMapDefinition>()
		);

		PackingSlipDataModels.TemplateDefinition resolved =
			PackingSlipTemplateRepository.getTemplate('DefaultHtml', 'SCREEN', 'SHIPMENT');

		System.assertEquals('Packaged HTML', resolved.name);
		PackingSlipTemplateRepository.clearTestData();
	}
}