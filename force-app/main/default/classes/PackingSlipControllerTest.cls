@IsTest
private class PackingSlipControllerTest {
	private static Id buildFakePackingSlipId() {
		return Id.valueOf(PackingSlip__c.SObjectType.getDescribe().getKeyPrefix() + '000000000000AAA');
	}

	private static void primeProviderTestData(Id packingSlipId) {
		PackingSlip__c packingSlip = new PackingSlip__c(
			TrackingNumber__c = 'TRK-400',
			Description__c = 'Controller test'
		);
		packingSlip.put('Name', 'PS-400');

		Order orderRecord = new Order();
		orderRecord.put('OrderNumber', 'ORD-400');
		packingSlip.putSObject('Order__r', orderRecord);

		SObject deliveryGroupRecord = Schema.getGlobalDescribe().get('DeliveryGroup__c').newSObject();
		deliveryGroupRecord.put('Name', 'Katherine Johnson');
		deliveryGroupRecord.put('DeliveryCenterName__c', 'Katherine Johnson');
		deliveryGroupRecord.put('AddressLabel__c', 'Katherine Johnson');
		deliveryGroupRecord.put('DeliveryAddressHtml__c', '1 Orbit Way');
		deliveryGroupRecord.put('DeliveryType__c', 'Ground');
		packingSlip.putSObject('DeliveryGroup__r', deliveryGroupRecord);

		DefaultPackingSlipDataProvider.setTestData(
			packingSlipId,
			packingSlip,
			new List<PackingSlipItem__c>()
		);
	}

	@IsTest
	static void controller_methods_returnRenderDataAndCloneDefaults() {
		Id packingSlipId = buildFakePackingSlipId();
		primeProviderTestData(packingSlipId);

		PackingSlipDataModels.TemplateDefinition screenTemplate = new PackingSlipDataModels.TemplateDefinition();
		screenTemplate.templateKey = 'DefaultHtml';
		screenTemplate.dimensions = 'LETTER_8_5X11';
		screenTemplate.name = 'Screen';
		screenTemplate.templateType = 'HTML';
		screenTemplate.outputMode = 'SCREEN';
		screenTemplate.providerKey = 'SHIPMENT';
		screenTemplate.isActive = true;
		screenTemplate.source = 'PACKAGED';
		screenTemplate.body = '<div>{{OrderNumber}}</div>';

		PackingSlipTemplateRepository.setTestData(
			new List<PackingSlipDataModels.TemplateDefinition>(),
			new List<PackingSlipDataModels.TemplateDefinition>{ screenTemplate },
			new List<PackingSlipDataModels.FieldMapDefinition>()
		);

		Test.startTest();
		PackingSlipDataModels.RenderResponse response =
			PackingSlipController.previewHtml(packingSlipId, 'DefaultHtml');
			List<PackingSlipDataModels.TemplateOption> options =
				PackingSlipController.getTemplateOptions(packingSlipId);
			String pdfUrl = PackingSlipController.getPdfUrl(packingSlipId, 'DefaultHtml', 'LABEL_6X4');
			Id clonedTemplateId = PackingSlipController.cloneDefaultTemplate('DefaultHtml');
		Test.stopTest();

		System.assert(response.html.contains('ORD-400'));
		System.assertEquals(1, options.size());
		System.assert(pdfUrl.contains('/apex/PackingSlipPdf'));
		System.assert(pdfUrl.contains('pageSize=LABEL_6X4'));
		System.assertNotEquals(null, clonedTemplateId);

		PackingSlipTemplateRepository.clearTestData();
		DefaultPackingSlipDataProvider.clearTestData();
	}

	@IsTest
	static void adminService_activatesSingleTemplatePerOutputMode() {
		PackingSlipTemplateOverride__c firstTemplate = new PackingSlipTemplateOverride__c(
			Name = 'Template A',
			Template_Key__c = 'A',
			Template_Type__c = 'HTML',
			Output_Mode__c = 'SCREEN',
			Dimensions__c = 'LETTER_8_5X11',
			Provider_Key__c = 'SHIPMENT',
			Is_Active__c = true,
			Body__c = '<div>A</div>',
			Subscriber_Override__c = true
		);
		PackingSlipTemplateOverride__c secondTemplate = new PackingSlipTemplateOverride__c(
			Name = 'Template B',
			Template_Key__c = 'B',
			Template_Type__c = 'HTML',
			Output_Mode__c = 'SCREEN',
			Dimensions__c = 'LETTER_8_5X11',
			Provider_Key__c = 'SHIPMENT',
			Is_Active__c = false,
			Body__c = '<div>B</div>',
			Subscriber_Override__c = true
		);
		insert new List<PackingSlipTemplateOverride__c>{ firstTemplate, secondTemplate };

		Test.startTest();
			PackingSlipController.setTemplateActive(secondTemplate.Id, true);
		Test.stopTest();

		Map<Id, PackingSlipTemplateOverride__c> recordsById = new Map<Id, PackingSlipTemplateOverride__c>([
			SELECT Id, Is_Active__c
			FROM PackingSlipTemplateOverride__c
			WHERE Id IN :new Set<Id>{ firstTemplate.Id, secondTemplate.Id }
		]);

		System.assertEquals(false, recordsById.get(firstTemplate.Id).Is_Active__c);
		System.assertEquals(true, recordsById.get(secondTemplate.Id).Is_Active__c);
	}
}