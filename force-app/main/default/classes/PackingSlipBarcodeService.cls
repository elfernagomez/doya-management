public with sharing class PackingSlipBarcodeService {
	private static final String BARCODE_IMAGE_URL =
		'https://barcode.orcascan.com/?type=code128&format=png&data=';
	private static final String QR_IMAGE_URL =
		'https://quickchart.io/qr?format=png&size=180&text=';

	public static String getBarcodeImageUrl(String value) {
		return String.isBlank(value) ? '' : BARCODE_IMAGE_URL + EncodingUtil.urlEncode(value, 'UTF-8');
	}

	public static String getQrImageUrl(String value) {
		return String.isBlank(value) ? '' : QR_IMAGE_URL + EncodingUtil.urlEncode(value, 'UTF-8');
	}

	public static String getBarcodeMarkup(String value) {
		if (String.isBlank(value))
			return '';
		return '<img alt="Barcode" class="barcode-image" src="' +
			escapeHtml(getBarcodeImageUrl(value)) + '" />';
	}

	public static String getQrMarkup(String value) {
		if (String.isBlank(value))
			return '';
		return '<img alt="QR Code" class="qr-image" src="' +
			escapeHtml(getQrImageUrl(value)) + '" />';
	}

	private static String escapeHtml(String value) {
		if (value == null)
			return '';
		return value
			.replace('&', '&amp;')
			.replace('<', '&lt;')
			.replace('>', '&gt;')
			.replace('"', '&quot;')
			.replace('\'', '&#39;');
	}
}