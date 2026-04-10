public with sharing class DefaultPackingSlipDataProvider extends IPackingSlipDataProvider {
	public static final String PROVIDER_KEY = 'SHIPMENT';
	@TestVisible private static Id testRecordId;
	@TestVisible private static PackingSlip__c testPackingSlip;
	@TestVisible private static List<PackingSlipItem__c> testPackingSlipItems;

	public override String getProviderKey() {
		return PROVIDER_KEY;
	}

	public override Boolean supports(Schema.SObjectType objectType) {
		return objectType == PackingSlip__c.SObjectType;
	}

	public override PackingSlipDataModels.DocumentData getDocumentData(
		Id recordId,
		PackingSlipDataModels.TemplateDefinition templateDefinition
	) {
		if (recordId == null)
			throw new AuraHandledException('A recordId is required to render a packing slip.');

		PackingSlip__c packingSlip = loadPackingSlip(recordId);
		List<PackingSlipItem__c> packingSlipItems = loadPackingSlipItems(recordId);

		SObject orderRecord = packingSlip.getSObject('Order__r');
		SObject deliveryGroupRecord = packingSlip.getSObject('DeliveryGroup__r');
		String orderNumber = orderRecord == null ? null : (String)orderRecord.get('OrderNumber');
		String carrier = deliveryGroupRecord == null ? null : (String)deliveryGroupRecord.get('DeliveryType__c');
		String shipToName = deliveryGroupRecord == null ? null : (String)deliveryGroupRecord.get('DeliveryCenterName__c');
		String shipToAddress = deliveryGroupRecord == null ? null : sanitizeAddress((String)deliveryGroupRecord.get('AddressHtml__c'));

		PackingSlipDataModels.DocumentData document = new PackingSlipDataModels.DocumentData();
		document.header.recordId = String.valueOf(packingSlip.Id);
		document.header.orderNumber = orderNumber;
		document.header.trackingNumber = packingSlip.TrackingNumber__c;
		document.header.carrier = carrier;
		document.header.description = packingSlip.Description__c;
		document.shipTo.name = shipToName;
		document.shipTo.address = shipToAddress;
		document.barcodeValue = packingSlip.TrackingNumber__c;
		document.qrValue = packingSlip.TrackingNumber__c;
		document.footerNotes = 'Generated from Packing Slip ' + packingSlip.Name + '.';
		document.tokenValues.put('ShipmentName', packingSlip.Name);
		document.tokenValues.put('PackingSlipName', packingSlip.Name);

		for (PackingSlipItem__c itemRecord : packingSlipItems) {
			SObject orderProductRecord = itemRecord.getSObject('OrderProduct__r');
			SObject productRecord = orderProductRecord == null ? null : orderProductRecord.getSObject('Product2');
			PackingSlipDataModels.LineItemData item = new PackingSlipDataModels.LineItemData();
			item.productCode = productRecord == null ? null : (String)productRecord.get('ProductCode');
			item.productName = productRecord == null ? itemRecord.Product__c : (String)productRecord.get('Name');
			item.quantity = itemRecord.Quantity__c;
			item.description = orderProductRecord == null ? itemRecord.Product__c : (String)orderProductRecord.get('Description');
			if (String.isBlank(item.productCode))
				item.productCode = item.productName;
			if (String.isBlank(item.productName))
				item.productName = itemRecord.Name;
			if (String.isBlank(item.description))
				item.description = item.productName;
			document.items.add(item);
		}

		return document;
	}

	private static PackingSlip__c loadPackingSlip(Id recordId) {
		if (testRecordId != null && testRecordId == recordId && testPackingSlip != null)
			return testPackingSlip;

		String query = String.join(
			new List<String>{
				'SELECT Id, Name, TrackingNumber__c, Description__c,',
				'Order__r.OrderNumber,',
				'DeliveryGroup__r.Name,',
				'DeliveryGroup__r.DeliveryCenterName__c,',
				'DeliveryGroup__r.AddressLabel__c,',
				'DeliveryGroup__r.AddressHtml__c,',
				'DeliveryGroup__r.DeliveryType__c',
				'FROM PackingSlip__c',
				'WHERE Id = :recordId',
				'LIMIT 1'
			},
			' '
		);

		return (PackingSlip__c)Database.query(query);
	}

	private static List<PackingSlipItem__c> loadPackingSlipItems(Id recordId) {
		if (testRecordId != null && testRecordId == recordId && testPackingSlipItems != null)
			return testPackingSlipItems;

		return [
			SELECT Id, Name, Product__c, Quantity__c,
				OrderProduct__r.Description,
				OrderProduct__r.Product2.Name,
				OrderProduct__r.Product2.ProductCode
			FROM PackingSlipItem__c
			WHERE PackingSlip__c = :recordId
			ORDER BY CreatedDate ASC
		];
	}

	private static String sanitizeAddress(String addressHtml) {
		if (String.isBlank(addressHtml))
			return null;

		String normalizedAddress = addressHtml.replaceAll('(?i)<br\\s*/?>', '\n');
		normalizedAddress = normalizedAddress.replaceAll('<[^>]+>', '');
		normalizedAddress = normalizedAddress.replace('&nbsp;', ' ');
		return normalizedAddress.trim();
	}

	@TestVisible
	static void setTestData(Id recordId, PackingSlip__c packingSlip, List<PackingSlipItem__c> packingSlipItems) {
		testRecordId = recordId;
		testPackingSlip = packingSlip;
		testPackingSlipItems = packingSlipItems;
	}

	@TestVisible
	static void clearTestData() {
		testRecordId = null;
		testPackingSlip = null;
		testPackingSlipItems = null;
	}
}