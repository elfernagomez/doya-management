public with sharing class PackingSlipDataProviderFactory {
	@TestVisible
	private static Map<String, IPackingSlipDataProvider> testProvidersByKey;

	public static IPackingSlipDataProvider getProviderForRecord(Id recordId) {
		if (recordId == null)
			return getProviderByKey(DefaultPackingSlipDataProvider.PROVIDER_KEY);

		Schema.SObjectType objectType = recordId.getSObjectType();
		for (IPackingSlipDataProvider provider : getAvailableProviders()) {
			if (provider.supports(objectType))
				return provider;
		}

		throw new AuraHandledException(
			'No packing slip provider is registered for ' + objectType.getDescribe().getName() + '.'
		);
	}

	public static IPackingSlipDataProvider getProviderByKey(String providerKey) {
		String normalizedKey = String.isBlank(providerKey) ?
			DefaultPackingSlipDataProvider.PROVIDER_KEY :
			providerKey.trim().toUpperCase();

		if (testProvidersByKey != null && testProvidersByKey.containsKey(normalizedKey))
			return testProvidersByKey.get(normalizedKey);

		if (normalizedKey == DefaultPackingSlipDataProvider.PROVIDER_KEY)
			return new DefaultPackingSlipDataProvider();

		throw new AuraHandledException('Unknown packing slip provider key: ' + normalizedKey + '.');
	}

	public static IPackingSlipDataProvider getProviderForTemplate(
		PackingSlipDataModels.TemplateDefinition templateDefinition,
		Id recordId
	) {
		if (templateDefinition != null && !String.isBlank(templateDefinition.providerKey))
			return getProviderByKey(templateDefinition.providerKey);

		return getProviderForRecord(recordId);
	}

	private static List<IPackingSlipDataProvider> getAvailableProviders() {
		if (testProvidersByKey != null)
			return new List<IPackingSlipDataProvider>(testProvidersByKey.values());

		return new List<IPackingSlipDataProvider>{
			new DefaultPackingSlipDataProvider()
		};
	}

	@TestVisible
	static void setTestProviders(Map<String, IPackingSlipDataProvider> providersByKey) {
		testProvidersByKey = providersByKey;
	}

	@TestVisible
	static void clearTestProviders() {
		testProvidersByKey = null;
	}
}