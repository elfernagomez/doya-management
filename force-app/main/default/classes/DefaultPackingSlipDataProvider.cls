public with sharing class DefaultPackingSlipDataProvider extends IPackingSlipDataProvider {
	public static final String PROVIDER_KEY = 'SHIPMENT';
	@TestVisible private static Id testRecordId;
	@TestVisible private static PackingSlip__c testPackingSlip;
	@TestVisible private static List<PackingSlipItem__c> testPackingSlipItems;
	@TestVisible private static List<PackingSlip__c> testDeliveryGroupPackingSlips;

	private class PackageSequenceData {
		public Integer currentPackageNumber;
		public Integer totalPackagesInGroup;
		public String packageSequenceDisplay;
	}

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
		PackageSequenceData packageSequenceData = resolvePackageSequenceData(packingSlip);

		SObject orderRecord = packingSlip.getSObject('Order__r');
		SObject deliveryGroupRecord = packingSlip.getSObject('DeliveryGroup__r');
		SObject accountRecord = orderRecord == null ? null : orderRecord.getSObject('Account');
		String orderName = orderRecord == null ? null : (String)orderRecord.get('Name');
		String orderNumber = orderRecord == null ? null : (String)orderRecord.get('OrderNumber');
		String orderDescription = orderRecord == null ? null : (String)orderRecord.get('Description');
		String poNumber = orderRecord == null ? null : (String)orderRecord.get('PoNumber');
		String accountName = accountRecord == null ? null : (String)accountRecord.get('Name');
		String deliveryGroupName = deliveryGroupRecord == null ? null : (String)deliveryGroupRecord.get('Name');
		String deliveryType = deliveryGroupRecord == null ? null : (String)deliveryGroupRecord.get('DeliveryType__c');
		String shipToName = deliveryGroupRecord == null ? null : (String)deliveryGroupRecord.get('DeliveryCenterName__c');
		String shipToAddress = deliveryGroupRecord == null ? null : sanitizeAddress((String)deliveryGroupRecord.get('DeliveryAddressHtml__c'));
		SObject deliveryCenterRecord = deliveryGroupRecord == null ? null : deliveryGroupRecord.getSObject('DeliveryCenter__r');
		SObject deliveryAttentionContactRecord = deliveryGroupRecord == null ?
			null :
			deliveryGroupRecord.getSObject('DeliveryCenterAttentionContact__r');
		String deliveryCenterPhone = deliveryCenterRecord == null ? null : (String)deliveryCenterRecord.get('Phone');
		String deliveryAttentionContactName = deliveryAttentionContactRecord == null ?
			null :
			(String)deliveryAttentionContactRecord.get('Name');
		SObject pickupCenterRecord = deliveryGroupRecord == null ? null : deliveryGroupRecord.getSObject('PickupCenter__r');
		SObject pickupAttentionContactRecord = deliveryGroupRecord == null ?
			null :
			deliveryGroupRecord.getSObject('PickupCenterAttentionContact__r');
		String shipFromName = pickupCenterRecord == null ? null : (String)pickupCenterRecord.get('Name');
		String shipFromAddress = deliveryGroupRecord == null ? null : sanitizeAddress((String)deliveryGroupRecord.get('PickupAddressHtml__c'));
		String pickupCenterPhone = pickupCenterRecord == null ? null : (String)pickupCenterRecord.get('Phone');
		String pickupAttentionContactName = pickupAttentionContactRecord == null ?
			null :
			(String)pickupAttentionContactRecord.get('Name');

		PackingSlipDataModels.DocumentData document = new PackingSlipDataModels.DocumentData();
		document.header.recordId = String.valueOf(packingSlip.Id);
		document.header.orderNumber = orderNumber;
		document.header.trackingNumber = packingSlip.TrackingNumber__c;
		document.header.carrier = deliveryType;
		document.header.description = packingSlip.Description__c;
		document.header.boxWidth = packingSlip.BoxWidth__c;
		document.header.boxHeight = packingSlip.BoxHeight__c;
		document.header.boxDepth = packingSlip.BoxDepth__c;
		document.header.boxWeight = packingSlip.BoxWeight__c;
		document.header.boxWeightUnitType = packingSlip.BoxWeightUnitType__c;
		document.tokenValues.put('DeliveryType', deliveryType);
		document.tokenValues.put('Group', deliveryGroupName);
		document.tokenValues.put('DeliveryGroupName', deliveryGroupName);
		document.tokenValues.put('BoxDimensions', buildBoxDimensions(document.header));
		document.tokenValues.put('BoxWeightDisplay', buildBoxWeight(document.header));
		document.tokenValues.put('OrderName', orderName);
		document.tokenValues.put('OrderDescription', orderDescription);
		document.tokenValues.put('PONumber', poNumber);
		document.tokenValues.put('AccountName', accountName);
		document.tokenValues.put('DeliveryCenterAttentionContactName', deliveryAttentionContactName);
		document.tokenValues.put('DeliveryCenterPhone', deliveryCenterPhone);
		document.tokenValues.put('PickupCenterAttentionContactName', pickupAttentionContactName);
		document.tokenValues.put('PickupCenterPhone', pickupCenterPhone);
		document.tokenValues.put('ShipToAttentionContactName', deliveryAttentionContactName);
		document.tokenValues.put('ShipToPhone', deliveryCenterPhone);
		document.tokenValues.put('ShipFromAttentionContactName', pickupAttentionContactName);
		document.tokenValues.put('ShipFromPhone', pickupCenterPhone);
		document.tokenValues.put('CurrentPackageNumber', packageSequenceData.currentPackageNumber);
		document.tokenValues.put('TotalPackagesInGroup', packageSequenceData.totalPackagesInGroup);
		document.tokenValues.put('PackageSequenceDisplay', packageSequenceData.packageSequenceDisplay);
		document.shipTo.name = shipToName;
		document.shipTo.address = shipToAddress;
		document.shipFrom.name = shipFromName;
		document.shipFrom.address = shipFromAddress;
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
			item.size = sanitizeInlineText((String)itemRecord.get('OrderItemDimensions__c'));
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
				'SELECT Id, Name, DeliveryGroup__c, TrackingNumber__c, Description__c, BoxWidth__c, BoxHeight__c, BoxDepth__c, BoxWeight__c, BoxWeightUnitType__c,',
				'Order__r.Name, Order__r.OrderNumber, Order__r.Description, Order__r.PoNumber, Order__r.Account.Name,',
				'DeliveryGroup__r.Name,',
				'DeliveryGroup__r.DeliveryCenterName__c,',
				'DeliveryGroup__r.DeliveryCenter__r.Phone,',
				'DeliveryGroup__r.DeliveryCenterAttentionContact__r.Name,',
				'DeliveryGroup__r.AddressLabel__c,',
				'DeliveryGroup__r.DeliveryAddressHtml__c,',
				'DeliveryGroup__r.PickupCenter__r.Name,',
				'DeliveryGroup__r.PickupCenter__r.Phone,',
				'DeliveryGroup__r.PickupCenterAttentionContact__r.Name,',
				'DeliveryGroup__r.PickupAddressHtml__c,',
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
			SELECT Id, Name, Product__c, Quantity__c, OrderItemDimensions__c,
				OrderProduct__r.Description,
				OrderProduct__r.Product2.Name,
				OrderProduct__r.Product2.ProductCode
			FROM PackingSlipItem__c
			WHERE PackingSlip__c = :recordId
			ORDER BY CreatedDate ASC
		];
	}

	private static List<PackingSlip__c> loadDeliveryGroupPackingSlips(Id deliveryGroupId) {
		if (testRecordId != null && testDeliveryGroupPackingSlips != null)
			return testDeliveryGroupPackingSlips;

		if (deliveryGroupId == null)
			return new List<PackingSlip__c>();

		return [
			SELECT Id, Name
			FROM PackingSlip__c
			WHERE DeliveryGroup__c = :deliveryGroupId
			ORDER BY CreatedDate ASC, Name ASC, Id ASC
		];
	}

	private static PackageSequenceData resolvePackageSequenceData(PackingSlip__c packingSlip) {
		PackageSequenceData data = new PackageSequenceData();
		data.currentPackageNumber = 1;
		data.totalPackagesInGroup = 1;
		data.packageSequenceDisplay = '1/1';

		if (packingSlip == null)
			return data;

		Id deliveryGroupId = (Id)packingSlip.get('DeliveryGroup__c');
		List<PackingSlip__c> groupPackingSlips = loadDeliveryGroupPackingSlips(deliveryGroupId);
		if (groupPackingSlips == null || groupPackingSlips.isEmpty())
			return data;

		data.totalPackagesInGroup = groupPackingSlips.size();
		String packingSlipIdValue = String.valueOf(packingSlip.Id);
		String packingSlipNameValue = (String)packingSlip.get('Name');

		for (Integer index = 0; index < groupPackingSlips.size(); index++) {
			PackingSlip__c groupPackingSlip = groupPackingSlips[index];
			if (String.valueOf(groupPackingSlip.Id) == packingSlipIdValue) {
				data.currentPackageNumber = index + 1;
				data.packageSequenceDisplay = data.currentPackageNumber + '/' + data.totalPackagesInGroup;
				return data;
			}
		}

		if (!String.isBlank(packingSlipNameValue)) {
			for (Integer index = 0; index < groupPackingSlips.size(); index++) {
				PackingSlip__c groupPackingSlip = groupPackingSlips[index];
				if ((String)groupPackingSlip.get('Name') == packingSlipNameValue) {
					data.currentPackageNumber = index + 1;
					break;
				}
			}
		}

		data.packageSequenceDisplay = data.currentPackageNumber + '/' + data.totalPackagesInGroup;
		return data;
	}

	private static String buildBoxDimensions(PackingSlipDataModels.HeaderData header) {
		if (header == null)
			return null;

		List<String> parts = new List<String>();
		if (header.boxWidth != null)
			parts.add(String.valueOf(header.boxWidth));
		if (header.boxHeight != null)
			parts.add(String.valueOf(header.boxHeight));
		if (header.boxDepth != null)
			parts.add(String.valueOf(header.boxDepth));

		return parts.isEmpty() ? null : String.join(parts, ' x ');
	}

	private static String buildBoxWeight(PackingSlipDataModels.HeaderData header) {
		if (header == null || header.boxWeight == null)
			return null;

		String unit = String.isBlank(header.boxWeightUnitType) ? '' : ' ' + header.boxWeightUnitType;
		return String.valueOf(header.boxWeight) + unit;
	}

	private static String sanitizeAddress(String addressHtml) {
		if (String.isBlank(addressHtml))
			return null;

		String normalizedAddress = addressHtml.replaceAll('(?i)<br\\s*/?>', '\n');
		normalizedAddress = normalizedAddress.replaceAll('<[^>]+>', '');
		normalizedAddress = normalizedAddress.replace('&nbsp;', ' ');
		return normalizedAddress.trim();
	}

	private static String sanitizeInlineText(String value) {
		if (String.isBlank(value))
			return null;

		String normalizedValue = value.replaceAll('(?i)<br\\s*/?>', ' ');
		normalizedValue = normalizedValue.replaceAll('<[^>]+>', ' ');
		normalizedValue = normalizedValue.replace('&nbsp;', ' ');
		normalizedValue = normalizedValue.replace('&times;', ' × ');
		normalizedValue = normalizedValue.replaceAll('(?i)[WHD]', ' ');
		normalizedValue = normalizedValue.replaceAll('\\s*[x×]\\s*', ' × ');
		normalizedValue = normalizedValue.replaceAll('\\s+', ' ');
		return normalizedValue.trim();
	}

	@TestVisible
	static void setTestData(Id recordId, PackingSlip__c packingSlip, List<PackingSlipItem__c> packingSlipItems) {
		testRecordId = recordId;
		testPackingSlip = packingSlip;
		testPackingSlipItems = packingSlipItems;
	}

	@TestVisible
	static void setTestData(
		Id recordId,
		PackingSlip__c packingSlip,
		List<PackingSlipItem__c> packingSlipItems,
		List<PackingSlip__c> deliveryGroupPackingSlips
	) {
		setTestData(recordId, packingSlip, packingSlipItems);
		testDeliveryGroupPackingSlips = deliveryGroupPackingSlips;
	}

	@TestVisible
	static void clearTestData() {
		testRecordId = null;
		testPackingSlip = null;
		testPackingSlipItems = null;
		testDeliveryGroupPackingSlips = null;
	}
}