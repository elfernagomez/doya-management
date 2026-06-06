public with sharing class PackingSlipTemplateRepository {
	@TestVisible private static List<PackingSlipDataModels.TemplateDefinition> testSubscriberTemplates;
	@TestVisible private static List<PackingSlipDataModels.TemplateDefinition> testPackagedTemplates;
	@TestVisible private static List<PackingSlipDataModels.FieldMapDefinition> testFieldMaps;

	public static PackingSlipDataModels.TemplateDefinition getTemplate(
		String templateKey,
		String outputMode,
		String providerKey
	) {
		return getTemplate(templateKey, outputMode, providerKey, null);
	}

	public static PackingSlipDataModels.TemplateDefinition getTemplate(
		String templateKey,
		String outputMode,
		String providerKey,
		String dimensions
	) {
		List<PackingSlipDataModels.TemplateDefinition> subscriberTemplates =
			filterTemplates(getSubscriberTemplates(), templateKey, outputMode, providerKey, dimensions, true);
		if (!subscriberTemplates.isEmpty())
			return subscriberTemplates[0];

		List<PackingSlipDataModels.TemplateDefinition> packagedTemplates =
			filterTemplates(getPackagedTemplates(), templateKey, outputMode, providerKey, dimensions, true);
		if (!packagedTemplates.isEmpty())
			return packagedTemplates[0];

		return null;
	}

	public static PackingSlipDataModels.TemplateDefinition getPackagedTemplate(String templateKey) {
		List<PackingSlipDataModels.TemplateDefinition> packagedTemplates =
			filterTemplates(getPackagedTemplates(), templateKey, null, null, null, false);
		return packagedTemplates.isEmpty() ? null : packagedTemplates[0];
	}

	public static List<PackingSlipDataModels.TemplateOption> getTemplateOptions(String providerKey) {
		Map<String, PackingSlipDataModels.TemplateDefinition> uniqueTemplatesByKey =
			new Map<String, PackingSlipDataModels.TemplateDefinition>();

		for (PackingSlipDataModels.TemplateDefinition templateDefinition :
			filterTemplates(getPackagedTemplates(), null, null, providerKey, null, true)) {
			uniqueTemplatesByKey.put(templateDefinition.templateKey + '|' + templateDefinition.dimensions, templateDefinition);
		}

		for (PackingSlipDataModels.TemplateDefinition templateDefinition :
			filterTemplates(getSubscriberTemplates(), null, null, providerKey, null, true)) {
			uniqueTemplatesByKey.put(templateDefinition.templateKey + '|' + templateDefinition.dimensions, templateDefinition);
		}

		List<PackingSlipDataModels.TemplateDefinition> orderedTemplates =
			new List<PackingSlipDataModels.TemplateDefinition>(uniqueTemplatesByKey.values());
		orderedTemplates.sort();

		List<PackingSlipDataModels.TemplateOption> options = new List<PackingSlipDataModels.TemplateOption>();
		for (PackingSlipDataModels.TemplateDefinition templateDefinition : orderedTemplates)
			if (templateDefinition.templateType == 'HTML')
				options.add(templateDefinition.toOption());
		return options;
	}

	public static List<PackingSlipDataModels.FieldMapDefinition> getFieldMaps(String templateKey) {
		List<PackingSlipDataModels.FieldMapDefinition> fieldMaps = new List<PackingSlipDataModels.FieldMapDefinition>();
		for (PackingSlipDataModels.FieldMapDefinition fieldMap : getAllFieldMaps()) {
			if (fieldMap.templateKey == templateKey)
				fieldMaps.add(fieldMap);
		}
		fieldMaps.sort();
		return fieldMaps;
	}

	public static List<PackingSlipDataModels.TemplateDefinition> getSubscriberTemplates() {
		if (testSubscriberTemplates != null)
			return cloneTemplateDefinitions(testSubscriberTemplates);

		List<PackingSlipTemplateOverride__c> templateRecords = [
			SELECT Id, Name, Template_Key__c, Template_Type__c, Output_Mode__c,
				Provider_Key__c, Is_Active__c, Body__c, Description__c, Dimensions__c,
				Subscriber_Override__c
			FROM PackingSlipTemplateOverride__c
			ORDER BY LastModifiedDate DESC
		];

		List<PackingSlipDataModels.TemplateDefinition> templates = new List<PackingSlipDataModels.TemplateDefinition>();
		for (PackingSlipTemplateOverride__c templateRecord : templateRecords) {
			PackingSlipDataModels.TemplateDefinition templateDefinition =
				new PackingSlipDataModels.TemplateDefinition();
			templateDefinition.id = String.valueOf(templateRecord.Id);
			templateDefinition.name = templateRecord.Name;
			templateDefinition.templateKey = templateRecord.Template_Key__c;
			templateDefinition.dimensions = normalizeDimensions(templateRecord.Dimensions__c);
			templateDefinition.templateType = templateRecord.Template_Type__c;
			templateDefinition.outputMode = templateRecord.Output_Mode__c;
			templateDefinition.providerKey = templateRecord.Provider_Key__c;
			templateDefinition.isActive = templateRecord.Is_Active__c;
			templateDefinition.body = templateRecord.Body__c;
			templateDefinition.description = templateRecord.Description__c;
			templateDefinition.source = 'SUBSCRIBER';
			templateDefinition.subscriberOverride = templateRecord.Subscriber_Override__c;
			templates.add(templateDefinition);
		}

		return templates;
	}

	private static List<PackingSlipDataModels.TemplateDefinition> getPackagedTemplates() {
		if (testPackagedTemplates != null)
			return cloneTemplateDefinitions(testPackagedTemplates);

		List<PackingSlipDataModels.TemplateDefinition> templates = new List<PackingSlipDataModels.TemplateDefinition>();
		for (SObject templateRecord : Database.query(
			'SELECT Id, DeveloperName, MasterLabel, Template_Key__c, Template_Type__c, ' +
			'Output_Mode__c, Provider_Key__c, Is_Active__c, Body__c, Description__c, Dimensions__c ' +
			'FROM PackingSlipTemplateDefault__mdt ORDER BY MasterLabel ASC'
		)) {
			PackingSlipDataModels.TemplateDefinition templateDefinition =
				new PackingSlipDataModels.TemplateDefinition();
			templateDefinition.id = String.valueOf(templateRecord.get('Id'));
			templateDefinition.name = (String)templateRecord.get('MasterLabel');
			templateDefinition.templateKey = (String)templateRecord.get('Template_Key__c');
			templateDefinition.dimensions = normalizeDimensions((String)templateRecord.get('Dimensions__c'));
			templateDefinition.templateType = (String)templateRecord.get('Template_Type__c');
			templateDefinition.outputMode = (String)templateRecord.get('Output_Mode__c');
			templateDefinition.providerKey = (String)templateRecord.get('Provider_Key__c');
			templateDefinition.isActive = (Boolean)templateRecord.get('Is_Active__c');
			templateDefinition.body = (String)templateRecord.get('Body__c');
			templateDefinition.description = (String)templateRecord.get('Description__c');
			templateDefinition.source = 'PACKAGED';
			templateDefinition.subscriberOverride = false;
			templates.add(templateDefinition);
		}

		return templates;
	}

	private static List<PackingSlipDataModels.FieldMapDefinition> getAllFieldMaps() {
		if (testFieldMaps != null)
			return cloneFieldMaps(testFieldMaps);

		List<PackingSlipDataModels.FieldMapDefinition> fieldMaps = new List<PackingSlipDataModels.FieldMapDefinition>();
		for (SObject fieldMapRecord : Database.query(
			'SELECT Template_Key__c, Field_Key__c, Field_Label__c, Field_Path__c, ' +
			'Display_Order__c, Is_Visible__c ' +
			'FROM PackingSlipFieldMap__mdt ' +
			'ORDER BY Template_Key__c ASC, Display_Order__c ASC, Field_Key__c ASC'
		)) {
			PackingSlipDataModels.FieldMapDefinition fieldMap =
				new PackingSlipDataModels.FieldMapDefinition();
			fieldMap.templateKey = (String)fieldMapRecord.get('Template_Key__c');
			fieldMap.fieldKey = (String)fieldMapRecord.get('Field_Key__c');
			fieldMap.fieldLabel = (String)fieldMapRecord.get('Field_Label__c');
			fieldMap.fieldPath = (String)fieldMapRecord.get('Field_Path__c');
			fieldMap.displayOrder = (Decimal)fieldMapRecord.get('Display_Order__c');
			fieldMap.isVisible = (Boolean)fieldMapRecord.get('Is_Visible__c');
			fieldMaps.add(fieldMap);
		}

		return fieldMaps;
	}

	private static List<PackingSlipDataModels.TemplateDefinition> filterTemplates(
		List<PackingSlipDataModels.TemplateDefinition> templates,
		String templateKey,
		String outputMode,
		String providerKey,
		String dimensions,
		Boolean activeOnly
	) {
		List<PackingSlipDataModels.TemplateDefinition> filteredTemplates =
			new List<PackingSlipDataModels.TemplateDefinition>();
		for (PackingSlipDataModels.TemplateDefinition templateDefinition : templates) {
			if (activeOnly && templateDefinition.isActive != true)
				continue;
			if (!String.isBlank(templateKey) && templateDefinition.templateKey != templateKey)
				continue;
			if (!String.isBlank(outputMode) && templateDefinition.outputMode != outputMode)
				continue;
			if (!String.isBlank(providerKey) && templateDefinition.providerKey != providerKey)
				continue;
			if (!String.isBlank(dimensions) && normalizeDimensions(templateDefinition.dimensions) != normalizeDimensions(dimensions))
				continue;
			filteredTemplates.add(templateDefinition);
		}

		filteredTemplates.sort();
		return filteredTemplates;
	}

	private static List<PackingSlipDataModels.TemplateDefinition> cloneTemplateDefinitions(
		List<PackingSlipDataModels.TemplateDefinition> sourceTemplates
	) {
		List<PackingSlipDataModels.TemplateDefinition> clones = new List<PackingSlipDataModels.TemplateDefinition>();
		for (PackingSlipDataModels.TemplateDefinition source : sourceTemplates) {
			PackingSlipDataModels.TemplateDefinition cloneTemplate =
				new PackingSlipDataModels.TemplateDefinition();
			cloneTemplate.id = source.id;
			cloneTemplate.name = source.name;
			cloneTemplate.templateKey = source.templateKey;
			cloneTemplate.dimensions = source.dimensions;
			cloneTemplate.templateType = source.templateType;
			cloneTemplate.outputMode = source.outputMode;
			cloneTemplate.providerKey = source.providerKey;
			cloneTemplate.isActive = source.isActive;
			cloneTemplate.body = source.body;
			cloneTemplate.description = source.description;
			cloneTemplate.source = source.source;
			cloneTemplate.subscriberOverride = source.subscriberOverride;
			clones.add(cloneTemplate);
		}
		return clones;
	}

	private static List<PackingSlipDataModels.FieldMapDefinition> cloneFieldMaps(
		List<PackingSlipDataModels.FieldMapDefinition> sourceFieldMaps
	) {
		List<PackingSlipDataModels.FieldMapDefinition> clones = new List<PackingSlipDataModels.FieldMapDefinition>();
		for (PackingSlipDataModels.FieldMapDefinition source : sourceFieldMaps) {
			PackingSlipDataModels.FieldMapDefinition cloneMap =
				new PackingSlipDataModels.FieldMapDefinition();
			cloneMap.templateKey = source.templateKey;
			cloneMap.fieldKey = source.fieldKey;
			cloneMap.fieldLabel = source.fieldLabel;
			cloneMap.fieldPath = source.fieldPath;
			cloneMap.displayOrder = source.displayOrder;
			cloneMap.isVisible = source.isVisible;
			clones.add(cloneMap);
		}
		return clones;
	}

	private static String normalizeDimensions(String dimensions) {
		if (String.isBlank(dimensions))
			return 'LETTER_8_5X11';

		String normalized = dimensions.trim().toUpperCase();
		if (normalized == 'LABEL_6X4')
			return 'LABEL_6X4';

		return 'LETTER_8_5X11';
	}

	@TestVisible
	static void setTestData(
		List<PackingSlipDataModels.TemplateDefinition> subscriberTemplates,
		List<PackingSlipDataModels.TemplateDefinition> packagedTemplates,
		List<PackingSlipDataModels.FieldMapDefinition> fieldMaps
	) {
		testSubscriberTemplates = subscriberTemplates;
		testPackagedTemplates = packagedTemplates;
		testFieldMaps = fieldMaps;
	}

	@TestVisible
	static void clearTestData() {
		testSubscriberTemplates = null;
		testPackagedTemplates = null;
		testFieldMaps = null;
	}
}