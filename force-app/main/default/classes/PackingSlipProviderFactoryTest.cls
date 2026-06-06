@IsTest
private class PackingSlipProviderFactoryTest {
	private static Id buildFakePackingSlipId() {
		return Id.valueOf(PackingSlip__c.SObjectType.getDescribe().getKeyPrefix() + '000000000000AAA');
	}

	private static PackingSlip__c buildTestPackingSlip(String orderNumber, String trackingNumber) {
		PackingSlip__c packingSlip = new PackingSlip__c(
			TrackingNumber__c = trackingNumber,
			Description__c = 'Priority'
		);
		packingSlip.put('Name', 'PS-TEST');

		Order orderRecord = new Order();
		orderRecord.put('OrderNumber', orderNumber);
		packingSlip.putSObject('Order__r', orderRecord);

		SObject deliveryGroupRecord = Schema.getGlobalDescribe().get('DeliveryGroup__c').newSObject();
		deliveryGroupRecord.put('Name', 'Ada Lovelace');
		deliveryGroupRecord.put('DeliveryCenterName__c', 'Ada Lovelace');
		deliveryGroupRecord.put('AddressLabel__c', 'Ada Lovelace');
		deliveryGroupRecord.put('DeliveryAddressHtml__c', '123 Main Street');
		deliveryGroupRecord.put('DeliveryType__c', 'UPS');
		packingSlip.putSObject('DeliveryGroup__r', deliveryGroupRecord);

		return packingSlip;
	}

	private static List<PackingSlipItem__c> buildTestItems() {
		PackingSlipItem__c itemRecord = new PackingSlipItem__c(
			Quantity__c = 4
		);
		itemRecord.put('Name', 'Item-1');
		itemRecord.put('Product__c', 'Widget');

		OrderItem orderProductRecord = new OrderItem();
		orderProductRecord.Description = 'Red';
		Product2 productRecord = new Product2(
			Name = 'Widget',
			ProductCode = 'SKU-1'
		);
		orderProductRecord.putSObject('Product2', productRecord);
		itemRecord.putSObject('OrderProduct__r', orderProductRecord);

		return new List<PackingSlipItem__c>{ itemRecord };
	}

	@IsTest
	static void factory_resolvesProviderByKeyAndRecordType() {
		Id packingSlipId = buildFakePackingSlipId();

		IPackingSlipDataProvider providerByKey =
			PackingSlipDataProviderFactory.getProviderByKey('SHIPMENT');
		IPackingSlipDataProvider providerByRecord =
			PackingSlipDataProviderFactory.getProviderForRecord(packingSlipId);

		System.assertEquals('SHIPMENT', providerByKey.getProviderKey());
		System.assertEquals('SHIPMENT', providerByRecord.getProviderKey());
	}

	@IsTest
	static void defaultProvider_returnsStructuredDocumentData() {
		Id packingSlipId = buildFakePackingSlipId();
		DefaultPackingSlipDataProvider.setTestData(
			packingSlipId,
			buildTestPackingSlip('ORD-200', 'TRK-200'),
			buildTestItems()
		);

		PackingSlipDataModels.DocumentData document =
			new DefaultPackingSlipDataProvider().getDocumentData(packingSlipId, null);

		System.assertEquals('TRK-200', document.header.trackingNumber);
		System.assertEquals('Ada Lovelace', document.shipTo.name);
		System.assertEquals(1, document.items.size());
		System.assertEquals('SKU-1', document.items[0].productCode);

		DefaultPackingSlipDataProvider.clearTestData();
	}
}