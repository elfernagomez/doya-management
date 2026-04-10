public abstract class IPackingSlipDataProvider {
	public abstract String getProviderKey();
	public abstract Boolean supports(Schema.SObjectType objectType);
	public abstract PackingSlipDataModels.DocumentData getDocumentData(
		Id recordId,
		PackingSlipDataModels.TemplateDefinition templateDefinition
	);
}