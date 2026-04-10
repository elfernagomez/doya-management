public with sharing class PackingSlipRenderService {
	public static String previewHtml(Id recordId, String templateKey) {
		PackingSlipDataModels.TemplateDefinition templateDefinition =
			resolveTemplate(recordId, templateKey, 'SCREEN');
		return wrapHtml(mergeTemplate(recordId, templateDefinition), false);
	}

	public static String pdfHtml(Id recordId, String templateKey) {
		PackingSlipDataModels.TemplateDefinition templateDefinition =
			resolveTemplate(recordId, templateKey, 'PDF');
		return wrapHtml(mergeTemplate(recordId, templateDefinition), true);
	}

	public static String generateZpl(Id recordId, String templateKey) {
		PackingSlipDataModels.TemplateDefinition templateDefinition =
			resolveTemplate(recordId, templateKey, 'ZPL');
		return PackingSlipMergeEngine.render(
			templateDefinition.body,
			buildMergeContext(recordId, templateDefinition)
		);
	}

	public static List<PackingSlipDataModels.TemplateOption> getTemplateOptions(Id recordId) {
		IPackingSlipDataProvider provider = PackingSlipDataProviderFactory.getProviderForRecord(recordId);
		return PackingSlipTemplateRepository.getTemplateOptions(provider.getProviderKey());
	}

	public static String getPdfUrl(Id recordId, String templateKey) {
		if (recordId == null)
			throw new AuraHandledException('A recordId is required for PDF rendering.');
		String url = '/apex/PackingSlipPdf?recordId=' + EncodingUtil.urlEncode(String.valueOf(recordId), 'UTF-8');
		if (!String.isBlank(templateKey))
			url += '&templateKey=' + EncodingUtil.urlEncode(templateKey, 'UTF-8');
		return url;
	}

	public static PackingSlipDataModels.RenderResponse buildPreviewResponse(Id recordId, String templateKey) {
		PackingSlipDataModels.TemplateDefinition templateDefinition =
			resolveTemplate(recordId, templateKey, 'SCREEN');
		PackingSlipDataModels.RenderResponse response = new PackingSlipDataModels.RenderResponse();
		response.templateKey = templateDefinition.templateKey;
		response.outputMode = templateDefinition.outputMode;
		response.providerKey = templateDefinition.providerKey;
		response.html = wrapHtml(mergeTemplate(recordId, templateDefinition), false);
		response.pdfUrl = getPdfUrl(recordId, templateDefinition.templateKey);
		response.zpl = generateZpl(recordId, 'DefaultZpl');
		return response;
	}

	private static PackingSlipDataModels.TemplateDefinition resolveTemplate(
		Id recordId,
		String templateKey,
		String outputMode
	) {
		IPackingSlipDataProvider provider = PackingSlipDataProviderFactory.getProviderForRecord(recordId);
		PackingSlipDataModels.TemplateDefinition templateDefinition =
			PackingSlipTemplateRepository.getTemplate(templateKey, outputMode, provider.getProviderKey());

		if (templateDefinition == null && !String.isBlank(templateKey))
			templateDefinition = PackingSlipTemplateRepository.getTemplate(templateKey, null, provider.getProviderKey());

		if (templateDefinition == null)
			throw new AuraHandledException(
				'No active packing slip template is configured for output mode ' + outputMode + '.'
			);

		return templateDefinition;
	}

	private static String mergeTemplate(
		Id recordId,
		PackingSlipDataModels.TemplateDefinition templateDefinition
	) {
		return PackingSlipMergeEngine.render(
			templateDefinition.body,
			buildMergeContext(recordId, templateDefinition)
		);
	}

	private static Map<String, Object> buildMergeContext(
		Id recordId,
		PackingSlipDataModels.TemplateDefinition templateDefinition
	) {
		IPackingSlipDataProvider provider =
			PackingSlipDataProviderFactory.getProviderForTemplate(templateDefinition, recordId);
		PackingSlipDataModels.DocumentData documentData =
			provider.getDocumentData(recordId, templateDefinition);
		Map<String, Object> context = documentData.toMergeContext();

		context.put('BarcodeImageUrl', PackingSlipBarcodeService.getBarcodeImageUrl(documentData.barcodeValue));
		context.put('QrImageUrl', PackingSlipBarcodeService.getQrImageUrl(documentData.qrValue));
		context.put('BarcodeSvg', PackingSlipBarcodeService.getBarcodeMarkup(documentData.barcodeValue));
		context.put('QrSvg', PackingSlipBarcodeService.getQrMarkup(documentData.qrValue));

		for (PackingSlipDataModels.FieldMapDefinition fieldMap :
			PackingSlipTemplateRepository.getFieldMaps(templateDefinition.templateKey)) {
			if (fieldMap.isVisible == false)
				continue;
			context.put(fieldMap.fieldKey, PackingSlipDataModels.resolvePath(context, fieldMap.fieldPath));
		}

		return context;
	}

	private static String wrapHtml(String body, Boolean isPdf) {
		return '<html><head><meta charset="UTF-8" /></head>' +
			'<body style="font-family:Arial,sans-serif;color:#1f2933;margin:0;padding:20px;">' +
			body +
			'</body></html>';
	}
}