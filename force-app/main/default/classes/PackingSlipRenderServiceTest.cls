@IsTest
private class PackingSlipRenderServiceTest {
	private static Id buildFakePackingSlipId() {
		return Id.valueOf(PackingSlip__c.SObjectType.getDescribe().getKeyPrefix() + '000000000000AAA');
	}

	private static void primeProviderTestData(Id packingSlipId) {
		PackingSlip__c packingSlip = new PackingSlip__c(
			TrackingNumber__c = 'TRK-300',
			Description__c = 'Handle with care'
		);
		packingSlip.put('Name', 'PS-300');

		Order orderRecord = new Order();
		orderRecord.put('OrderNumber', 'ORD-300');
		packingSlip.putSObject('Order__r', orderRecord);

		SObject deliveryGroupRecord = Schema.getGlobalDescribe().get('DeliveryGroup__c').newSObject();
		deliveryGroupRecord.put('Name', 'Grace Hopper');
		deliveryGroupRecord.put('DeliveryCenterName__c', 'Grace Hopper');
		deliveryGroupRecord.put('AddressLabel__c', 'Grace Hopper');
		deliveryGroupRecord.put('DeliveryAddressHtml__c', '100 Example Road');
		deliveryGroupRecord.put('DeliveryType__c', 'FedEx');
		packingSlip.putSObject('DeliveryGroup__r', deliveryGroupRecord);

		PackingSlipItem__c itemRecord = new PackingSlipItem__c(
			Quantity__c = 1
		);
		itemRecord.put('Name', 'Item-300');
		itemRecord.put('Product__c', 'Label Printer');
		OrderItem orderProductRecord = new OrderItem();
		orderProductRecord.Description = 'Industrial';
		Product2 productRecord = new Product2(
			Name = 'Label Printer',
			ProductCode = 'SKU-300'
		);
		orderProductRecord.putSObject('Product2', productRecord);
		itemRecord.putSObject('OrderProduct__r', orderProductRecord);

		DefaultPackingSlipDataProvider.setTestData(
			packingSlipId,
			packingSlip,
			new List<PackingSlipItem__c>{ itemRecord }
		);
	}

	@IsTest
	static void renderService_generatesHtmlAndPdfFromSingleTemplate() {
		Id packingSlipId = buildFakePackingSlipId();
		primeProviderTestData(packingSlipId);

		PackingSlipDataModels.TemplateDefinition screenTemplate = new PackingSlipDataModels.TemplateDefinition();
		screenTemplate.templateKey = 'DefaultHtml';
		screenTemplate.dimensions = 'LETTER_8_5X11';
		screenTemplate.name = 'HTML';
		screenTemplate.templateType = 'HTML';
		screenTemplate.outputMode = 'SCREEN';
		screenTemplate.providerKey = 'SHIPMENT';
		screenTemplate.isActive = true;
		screenTemplate.source = 'PACKAGED';
		screenTemplate.body = '<div>{{OrderNumber}} {{#each Items}}{{ProductCode}}{{/each}} {{BarcodeSvg}}</div>';

		PackingSlipTemplateRepository.setTestData(
			new List<PackingSlipDataModels.TemplateDefinition>(),
			new List<PackingSlipDataModels.TemplateDefinition>{ screenTemplate },
			new List<PackingSlipDataModels.FieldMapDefinition>()
		);

		String html = PackingSlipRenderService.previewHtml(packingSlipId, 'DefaultHtml');
		String labelHtml = PackingSlipRenderService.previewHtml(packingSlipId, 'DefaultHtml', 'LABEL_6X4');
		String pdfHtml = PackingSlipRenderService.pdfHtml(packingSlipId, 'DefaultHtml', 'LABEL_6X4');

		System.assert(html.contains('ORD-300'));
		System.assert(html.contains('SKU-300'));
		System.assert(html.contains('8.5in 11in'));
		System.assert(labelHtml.contains('6in 4in'));
		System.assert(pdfHtml.contains('6in 4in'));
		System.assert(pdfHtml.contains('ORD-300'));

		PackingSlipTemplateRepository.clearTestData();
		DefaultPackingSlipDataProvider.clearTestData();
	}
}