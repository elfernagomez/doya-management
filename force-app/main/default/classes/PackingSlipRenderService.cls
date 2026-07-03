public with sharing class PackingSlipRenderService {
	private static final String PAGE_SIZE_LABEL_6X4 = 'LABEL_6X4';
	private static final String PAGE_SIZE_LETTER_8_5X11 = 'LETTER_8_5X11';

	public static String previewHtml(Id recordId, String templateKey) {
		return previewHtml(recordId, templateKey, null);
	}

	public static String previewHtml(Id recordId, String templateKey, String pageSize) {
		PackingSlipDataModels.TemplateDefinition templateDefinition =
			resolveTemplate(recordId, templateKey, 'SCREEN', pageSize);
		return wrapHtml(mergeTemplate(recordId, templateDefinition), false, pageSize);
	}

	public static String pdfHtml(Id recordId, String templateKey) {
		return pdfHtml(recordId, templateKey, null);
	}

	public static String pdfHtml(Id recordId, String templateKey, String pageSize) {
		PackingSlipDataModels.TemplateDefinition templateDefinition =
			resolveTemplate(recordId, templateKey, 'SCREEN', pageSize);
		return wrapHtml(mergeTemplate(recordId, templateDefinition), true, pageSize);
	}

	public static List<PackingSlipDataModels.TemplateOption> getTemplateOptions(Id recordId) {
		IPackingSlipDataProvider provider = PackingSlipDataProviderFactory.getProviderForRecord(recordId);
		return PackingSlipTemplateRepository.getTemplateOptions(provider.getProviderKey());
	}

	public static String getPdfUrl(Id recordId, String templateKey, String pageSize) {
		if (recordId == null)
			throw new AuraHandledException('A recordId is required for PDF rendering.');
		String url = '/apex/PackingSlipPdf?recordId=' + EncodingUtil.urlEncode(String.valueOf(recordId), 'UTF-8');
		if (!String.isBlank(templateKey))
			url += '&templateKey=' + EncodingUtil.urlEncode(templateKey, 'UTF-8');
		url += '&pageSize=' + EncodingUtil.urlEncode(normalizePageSize(pageSize), 'UTF-8');
		return url;
	}

	public static String getPdfUrl(Id recordId, String templateKey) {
		return getPdfUrl(recordId, templateKey, null);
	}

	public static PackingSlipDataModels.RenderResponse buildPreviewResponse(Id recordId, String templateKey) {
		PackingSlipDataModels.TemplateDefinition templateDefinition =
			resolveTemplate(recordId, templateKey, 'SCREEN', null);
		PackingSlipDataModels.RenderResponse response = new PackingSlipDataModels.RenderResponse();
		response.templateKey = templateDefinition.templateKey;
		response.outputMode = templateDefinition.outputMode;
		response.providerKey = templateDefinition.providerKey;
		response.html = wrapHtml(mergeTemplate(recordId, templateDefinition), false, null);
		response.pdfUrl = getPdfUrl(recordId, templateDefinition.templateKey);
		return response;
	}

	private static PackingSlipDataModels.TemplateDefinition resolveTemplate(
		Id recordId,
		String templateKey,
		String outputMode,
		String pageSize
	) {
		IPackingSlipDataProvider provider = PackingSlipDataProviderFactory.getProviderForRecord(recordId);
		PackingSlipDataModels.TemplateDefinition templateDefinition =
			PackingSlipTemplateRepository.getTemplate(
				templateKey,
				outputMode,
				provider.getProviderKey(),
				normalizePageSize(pageSize)
			);

		if (templateDefinition == null && !String.isBlank(templateKey))
			templateDefinition = PackingSlipTemplateRepository.getTemplate(
				templateKey,
				null,
				provider.getProviderKey(),
				normalizePageSize(pageSize)
			);

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

	private static String wrapHtml(String body, Boolean isPdf, String pageSize) {
		String normalizedPageSize = normalizePageSize(pageSize);
		String pageCss;
		String documentStyle;
		String previewMinSizeStyle;
		if (normalizedPageSize == PAGE_SIZE_LABEL_6X4) {
			pageCss = '@page { size: 6in 4in; margin: 0.1in; }';
			documentStyle = 'padding:0.1in;box-sizing:border-box;';
			previewMinSizeStyle = 'width:6in;height:4in;';
		} else {
			pageCss = '@page { size: 8.5in 11in; margin: 0.2in; }';
			documentStyle = 'padding:0.2in;box-sizing:border-box;';
			previewMinSizeStyle = 'width:8.5in;min-height:11in;';
		}

		String bodyStyle = isPdf ?
			'font-family:Arial,sans-serif;color:#1f2933;margin:0;padding:0;background:#ffffff;' :
			'font-family:Arial,sans-serif;color:#1f2933;margin:0;padding:1rem;background:#f8f9fb;';
		String wrapperStyle = isPdf ?
			documentStyle :
			'margin:0 auto;background:#ffffff;border:1px solid #d8dde6;border-radius:0.5rem;' +
			previewMinSizeStyle +
			documentStyle;

		return '<html><head><meta charset="UTF-8" /><style>' + pageCss + '</style></head>' +
			'<body style="' + bodyStyle + '">' +
			'<div style="' + wrapperStyle + '">' +
			body +
			'</div></body></html>';
	}

	private static String normalizePageSize(String pageSize) {
		if (String.isBlank(pageSize))
			return PAGE_SIZE_LETTER_8_5X11;

		String normalized = pageSize.trim().toUpperCase();
		if (normalized == PAGE_SIZE_LABEL_6X4)
			return PAGE_SIZE_LABEL_6X4;

		return PAGE_SIZE_LETTER_8_5X11;
	}
}