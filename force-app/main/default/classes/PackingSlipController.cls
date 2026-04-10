public with sharing class PackingSlipController {
	@AuraEnabled(cacheable=true)
	public static PackingSlipDataModels.RenderResponse previewHtml(Id recordId, String templateKey) {
		return PackingSlipRenderService.buildPreviewResponse(recordId, templateKey);
	}

	@AuraEnabled(cacheable=true)
	public static List<PackingSlipDataModels.TemplateOption> getTemplateOptions(Id recordId) {
		return PackingSlipRenderService.getTemplateOptions(recordId);
	}

	@AuraEnabled(cacheable=true)
	public static String getPdfUrl(Id recordId, String templateKey) {
		return PackingSlipRenderService.getPdfUrl(recordId, templateKey);
	}

	@AuraEnabled
	public static String generateZpl(Id recordId, String templateKey) {
		return PackingSlipRenderService.generateZpl(recordId, templateKey);
	}

	@AuraEnabled
	public static Id cloneDefaultTemplate(String templateKey) {
		return PackingSlipTemplateCloneService.cloneDefaultToSubscriber(templateKey);
	}

	@AuraEnabled(cacheable=true)
	public static List<PackingSlipDataModels.TemplateDefinition> listSubscriberTemplates(String providerKey) {
		return PackingSlipAdminService.listSubscriberTemplates(providerKey);
	}

	@AuraEnabled
	public static void setTemplateActive(Id templateId, Boolean isActive) {
		PackingSlipAdminService.setTemplateActive(templateId, isActive);
	}
}