public class PackingSlipDataModels {
	public class TemplateDefinition implements Comparable {
		@AuraEnabled public String id;
		@AuraEnabled public String name;
		@AuraEnabled public String templateKey;
		@AuraEnabled public String templateType;
		@AuraEnabled public String outputMode;
		@AuraEnabled public String providerKey;
		@AuraEnabled public Boolean isActive;
		@AuraEnabled public String body;
		@AuraEnabled public String description;
		@AuraEnabled public String source;
		@AuraEnabled public Boolean subscriberOverride;

		public TemplateOption toOption() {
			TemplateOption option = new TemplateOption();
			option.label = String.isBlank(name) ? templateKey : name;
			option.value = templateKey;
			option.templateKey = templateKey;
			option.templateType = templateType;
			option.outputMode = outputMode;
			option.providerKey = providerKey;
			option.source = source;
			option.isActive = isActive;
			return option;
		}

		public Integer compareTo(Object otherValue) {
			TemplateDefinition otherTemplate = (TemplateDefinition)otherValue;

			String leftSource = String.isBlank(source) ? 'PACKAGED' : source;
			String rightSource = String.isBlank(otherTemplate.source) ? 'PACKAGED' : otherTemplate.source;
			if (leftSource != rightSource)
				return leftSource == 'SUBSCRIBER' ? -1 : 1;

			String leftName = String.isBlank(name) ? templateKey : name;
			String rightName = String.isBlank(otherTemplate.name) ? otherTemplate.templateKey : otherTemplate.name;
			return leftName.toLowerCase().compareTo(rightName.toLowerCase());
		}
	}

	public class TemplateOption {
		@AuraEnabled public String label;
		@AuraEnabled public String value;
		@AuraEnabled public String templateKey;
		@AuraEnabled public String templateType;
		@AuraEnabled public String outputMode;
		@AuraEnabled public String providerKey;
		@AuraEnabled public String source;
		@AuraEnabled public Boolean isActive;
	}

	public class FieldMapDefinition implements Comparable {
		@AuraEnabled public String templateKey;
		@AuraEnabled public String fieldKey;
		@AuraEnabled public String fieldLabel;
		@AuraEnabled public String fieldPath;
		@AuraEnabled public Decimal displayOrder;
		@AuraEnabled public Boolean isVisible;

		public Integer compareTo(Object otherValue) {
			FieldMapDefinition otherMap = (FieldMapDefinition)otherValue;
			Decimal leftOrder = displayOrder == null ? 0 : displayOrder;
			Decimal rightOrder = otherMap.displayOrder == null ? 0 : otherMap.displayOrder;
			if (leftOrder == rightOrder)
				return String.valueOf(fieldKey).compareTo(String.valueOf(otherMap.fieldKey));
			return leftOrder > rightOrder ? 1 : -1;
		}
	}

	public class HeaderData {
		@AuraEnabled public String recordId;
		@AuraEnabled public String orderNumber;
		@AuraEnabled public String trackingNumber;
		@AuraEnabled public String carrier;
		@AuraEnabled public String description;

		public Map<String, Object> toMap() {
			return new Map<String, Object>{
				'RecordId' => recordId,
				'OrderNumber' => orderNumber,
				'TrackingNumber' => trackingNumber,
				'Carrier' => carrier,
				'Description' => description
			};
		}
	}

	public class AddressBlock {
		@AuraEnabled public String name;
		@AuraEnabled public String address;

		public Map<String, Object> toMap() {
			return new Map<String, Object>{
				'Name' => name,
				'Address' => address
			};
		}
	}

	public class LineItemData {
		@AuraEnabled public String productCode;
		@AuraEnabled public String productName;
		@AuraEnabled public Decimal quantity;
		@AuraEnabled public String description;

		public Map<String, Object> toMap() {
			return new Map<String, Object>{
				'ProductCode' => productCode,
				'ProductName' => productName,
				'Quantity' => quantity,
				'Description' => description
			};
		}
	}

	public class DocumentData {
		@AuraEnabled public HeaderData header = new HeaderData();
		@AuraEnabled public AddressBlock shipTo = new AddressBlock();
		@AuraEnabled public List<LineItemData> items = new List<LineItemData>();
		@AuraEnabled public String barcodeValue;
		@AuraEnabled public String qrValue;
		@AuraEnabled public String logoUrl;
		@AuraEnabled public String imageUrl;
		@AuraEnabled public String footerNotes;
		@AuraEnabled public Map<String, Object> tokenValues = new Map<String, Object>();

		public Map<String, Object> toMergeContext() {
			Map<String, Object> context = new Map<String, Object>();
			Map<String, Object> headerMap = header == null ? new Map<String, Object>() : header.toMap();
			Map<String, Object> shipToMap = shipTo == null ? new Map<String, Object>() : shipTo.toMap();
			List<Object> itemMaps = new List<Object>();

			for (LineItemData item : items)
				itemMaps.add(item.toMap());

			context.putAll(headerMap);
			context.put('Header', headerMap);
			context.put('ShipTo', shipToMap);
			context.putAll(new Map<String, Object>{
				'ShipToName' => shipToMap.get('Name'),
				'ShipToAddress' => shipToMap.get('Address'),
				'Items' => itemMaps,
				'BarcodeValue' => barcodeValue,
				'QrValue' => qrValue,
				'LogoUrl' => logoUrl,
				'ImageUrl' => imageUrl,
				'FooterNotes' => footerNotes
			});

			if (tokenValues != null)
				context.putAll(tokenValues);

			return context;
		}
	}

	public class RenderResponse {
		@AuraEnabled public String templateKey;
		@AuraEnabled public String outputMode;
		@AuraEnabled public String providerKey;
		@AuraEnabled public String html;
		@AuraEnabled public String pdfUrl;
		@AuraEnabled public String zpl;
	}

	public static Object resolvePath(Map<String, Object> context, String path) {
		if (context == null || String.isBlank(path))
			return null;

		Object current = context;
		for (String segment : path.split('\\.')) {
			if (!(current instanceof Map<String, Object>))
				return null;

			current = ((Map<String, Object>)current).get(segment);
			if (current == null)
				return null;
		}

		return current;
	}

	public static String stringValue(Object value) {
		return value == null ? '' : String.valueOf(value);
	}
}