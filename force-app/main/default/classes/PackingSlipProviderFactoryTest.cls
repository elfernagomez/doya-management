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

		Order orderRecord = (Order)JSON.deserialize(
			'{"OrderNumber":"' + orderNumber + '"}',
			Order.class
		);
		packingSlip.putSObject('Order__r', orderRecord);

		packingSlip.putSObject('DeliveryGroup__r', Schema.getGlobalDescribe().get('DeliveryGroup__c').newSObject());

		return packingSlip;
	}

	private static List<PackingSlipItem__c> buildTestItems() {
		PackingSlipItem__c itemRecord = new PackingSlipItem__c(
			Quantity__c = 4
		);

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
		PackingSlip__c firstGroupPackingSlip = new PackingSlip__c();

		PackingSlip__c secondGroupPackingSlip = new PackingSlip__c(Id = packingSlipId);

		PackingSlip__c thirdGroupPackingSlip = new PackingSlip__c();

		List<PackingSlip__c> groupPackingSlips = new List<PackingSlip__c>{
			firstGroupPackingSlip,
			secondGroupPackingSlip,
			thirdGroupPackingSlip
		};
		PackingSlip__c packingSlip = buildTestPackingSlip('ORD-200', 'TRK-200');
		packingSlip.Id = packingSlipId;
		DefaultPackingSlipDataProvider.setTestData(
			packingSlipId,
			packingSlip,
			buildTestItems(),
			groupPackingSlips
		);

		PackingSlipDataModels.DocumentData document =
			new DefaultPackingSlipDataProvider().getDocumentData(packingSlipId, null);

		System.assertEquals('TRK-200', document.header.trackingNumber);
		System.assertEquals(1, document.items.size());
		System.assertEquals('SKU-1', document.items[0].productCode);
		System.assertEquals(2, document.tokenValues.get('CurrentPackageNumber'));
		System.assertEquals(3, document.tokenValues.get('TotalPackagesInGroup'));
		System.assertEquals('2/3', document.tokenValues.get('PackageSequenceDisplay'));

		DefaultPackingSlipDataProvider.clearTestData();
	}
}