public class PackingSlipMergeEngine {
	private static final Pattern TOKEN_PATTERN =
		Pattern.compile('\\{\\{\\s*([A-Za-z0-9_\\.]+)\\s*\\}\\}');

	public static String render(String templateBody, Map<String, Object> context) {
		if (String.isBlank(templateBody))
			return '';

		String merged = processEachBlocks(templateBody, context == null ? new Map<String, Object>() : context);
		merged = processIfBlocks(merged, context == null ? new Map<String, Object>() : context);
		return replaceTokens(merged, context == null ? new Map<String, Object>() : context);
	}

	private static String processEachBlocks(String input, Map<String, Object> context) {
		return processBlocks(input, context, '{{#each ', '{{/each}}', true);
	}

	private static String processIfBlocks(String input, Map<String, Object> context) {
		return processBlocks(input, context, '{{#if ', '{{/if}}', false);
	}

	private static String processBlocks(
		String input,
		Map<String, Object> context,
		String openingToken,
		String closingToken,
		Boolean isEachBlock
	) {
		String output = input;
		Integer openingIndex = output.indexOf(openingToken);
		while (openingIndex >= 0) {
			Integer expressionStart = openingIndex + openingToken.length();
			Integer expressionEnd = output.indexOf('}}', expressionStart);
			if (expressionEnd < 0)
				break;

			String expression = output.substring(expressionStart, expressionEnd).trim();
			Integer blockEndStart = findMatchingBlockEnd(output, expressionEnd + 2, openingToken, closingToken);
			if (blockEndStart < 0)
				break;

			Integer blockEnd = blockEndStart + closingToken.length();
			String blockBody = output.substring(expressionEnd + 2, blockEndStart);
			String replacement = isEachBlock ?
				renderEachBlock(expression, blockBody, context) :
				renderIfBlock(expression, blockBody, context);

			output = output.substring(0, openingIndex) + replacement + output.substring(blockEnd);
			openingIndex = output.indexOf(openingToken);
		}

		return output;
	}

	private static Integer findMatchingBlockEnd(
		String input,
		Integer searchFrom,
		String openingToken,
		String closingToken
	) {
		Integer depth = 1;
		Integer cursor = searchFrom;
		while (cursor < input.length()) {
			Integer nextOpen = input.indexOf(openingToken, cursor);
			Integer nextClose = input.indexOf(closingToken, cursor);

			if (nextClose < 0)
				return -1;

			if (nextOpen >= 0 && nextOpen < nextClose) {
				depth++;
				cursor = nextOpen + openingToken.length();
			} else {
				depth--;
				if (depth == 0)
					return nextClose;
				cursor = nextClose + closingToken.length();
			}
		}

		return -1;
	}

	private static String renderEachBlock(
		String expression,
		String blockBody,
		Map<String, Object> context
	) {
		Object resolvedValue = PackingSlipDataModels.resolvePath(context, expression);
		if (!(resolvedValue instanceof List<Object>))
			return '';

		List<Object> records = (List<Object>)resolvedValue;
		List<String> renderedRows = new List<String>();
		for (Object rowValue : records) {
			Map<String, Object> rowContext = new Map<String, Object>();
			rowContext.putAll(context);
			if (rowValue instanceof Map<String, Object>) {
				rowContext.putAll((Map<String, Object>)rowValue);
			} else {
				rowContext.put('this', rowValue);
			}
			renderedRows.add(render(blockBody, rowContext));
		}

		return String.join(renderedRows, '');
	}

	private static String renderIfBlock(
		String expression,
		String blockBody,
		Map<String, Object> context
	) {
		Object resolvedValue = PackingSlipDataModels.resolvePath(context, expression);
		return isTruthy(resolvedValue) ? render(blockBody, context) : '';
	}

	private static String replaceTokens(String input, Map<String, Object> context) {
		Matcher matcher = TOKEN_PATTERN.matcher(input);
		String output = '';
		Integer lastIndex = 0;
		while (matcher.find()) {
			String token = matcher.group(1);
			Integer startIndex = matcher.start();
			Integer endIndex = matcher.end();
			Object replacementValue = PackingSlipDataModels.resolvePath(context, token);
			String replacement = replacementValue == null ? '' : String.valueOf(replacementValue);
			output += input.substring(lastIndex, startIndex) + replacement;
			lastIndex = endIndex;
		}
		return output + input.substring(lastIndex);
	}

	private static Boolean isTruthy(Object value) {
		if (value == null)
			return false;
		if (value instanceof Boolean)
			return (Boolean)value;
		if (value instanceof Decimal)
			return ((Decimal)value) != 0;
		if (value instanceof Integer)
			return ((Integer)value) != 0;
		if (value instanceof List<Object>)
			return !((List<Object>)value).isEmpty();
		String stringValue = String.valueOf(value);
		return !String.isBlank(stringValue) && stringValue != 'false';
	}
}