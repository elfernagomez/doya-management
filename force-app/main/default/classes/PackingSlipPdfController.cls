public with sharing class PackingSlipPdfController {
	private final String mergedHtml;

	public PackingSlipPdfController() {
		String recordIdParameter = ApexPages.currentPage().getParameters().get('recordId');
		String templateKey = ApexPages.currentPage().getParameters().get('templateKey');
		String pageSize = ApexPages.currentPage().getParameters().get('pageSize');
		Boolean previewMode = 'preview'.equalsIgnoreCase(ApexPages.currentPage().getParameters().get('mode'));
		Boolean printMode = '1'.equals(ApexPages.currentPage().getParameters().get('print'));
		if (String.isBlank(recordIdParameter)) {
			mergedHtml = '<div>Missing recordId parameter.</div>';
			return;
		}

		String html = previewMode ?
			PackingSlipRenderService.previewHtml((Id)recordIdParameter, templateKey, pageSize) :
			PackingSlipRenderService.pdfHtml((Id)recordIdParameter, templateKey, pageSize);

		if (printMode)
			html = html.replace(
				'</body>',
				'<script>window.addEventListener("load", function(){ window.print(); });</script></body>'
			);

		mergedHtml = html;
	}

	public String getMergedHtml() {
		return mergedHtml;
	}
}