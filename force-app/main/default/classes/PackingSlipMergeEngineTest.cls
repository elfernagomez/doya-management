@IsTest
private class PackingSlipMergeEngineTest {
	@IsTest
	static void tokenReplacement_replacesKnownTokenAndBlanksMissingToken() {
		Map<String, Object> context = new Map<String, Object>{
			'TrackingNumber' => '1Z999'
		};

		String merged = PackingSlipMergeEngine.render(
			'Track {{TrackingNumber}} / {{MissingValue}}',
			context
		);

		System.assertEquals('Track 1Z999 / ', merged);
	}

	@IsTest
	static void ifBlock_rendersOnlyWhenTruthy() {
		Map<String, Object> context = new Map<String, Object>{
			'Carrier' => 'UPS',
			'BlankValue' => ''
		};

		String merged = PackingSlipMergeEngine.render(
			'{{#if Carrier}}Carrier={{Carrier}}{{/if}}{{#if BlankValue}}ShouldNotRender{{/if}}',
			context
		);

		System.assertEquals('Carrier=UPS', merged);
	}

	@IsTest
	static void eachBlock_rendersAllItems() {
		Map<String, Object> context = new Map<String, Object>{
			'Items' => new List<Object>{
				new Map<String, Object>{ 'ProductCode' => 'A1', 'Quantity' => 2 },
				new Map<String, Object>{ 'ProductCode' => 'B2', 'Quantity' => 5 }
			}
		};

		String merged = PackingSlipMergeEngine.render(
			'{{#each Items}}[{{ProductCode}}:{{Quantity}}]{{/each}}',
			context
		);

		System.assertEquals('[A1:2][B2:5]', merged);
	}

	@IsTest
	static void nestedBlocks_renderInsideEachScope() {
		Map<String, Object> context = new Map<String, Object>{
			'Items' => new List<Object>{
				new Map<String, Object>{ 'ProductCode' => 'A1', 'Description' => 'Widget' },
				new Map<String, Object>{ 'ProductCode' => 'B2', 'Description' => '' }
			}
		};

		String merged = PackingSlipMergeEngine.render(
			'{{#each Items}}{{ProductCode}}{{#if Description}}-{{Description}}{{/if}};{{/each}}',
			context
		);

		System.assertEquals('A1-Widget;B2;', merged);
	}
}