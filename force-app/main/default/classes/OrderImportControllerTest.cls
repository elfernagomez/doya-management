@isTest
private class OrderImportControllerTest {
	@isTest
	static void importCsv_createsOrderAndOrderItem() {
		Id standardPricebookId = Test.getStandardPricebookId();

		Account accountRecord = new Account(Name = 'Import Account');
		insert accountRecord;

		Product2 productRecord = new Product2(
			Name = 'Import Product',
			IsActive = true,
			Category__c = 'Other',
			RecordTypeId = Schema.SObjectType.Product2
				.getRecordTypeInfosByDeveloperName()
				.get('Product')
				.getRecordTypeId()
		);
		insert productRecord;

		insert new PricebookEntry(
			Product2Id = productRecord.Id,
			Pricebook2Id = standardPricebookId,
			UnitPrice = 100,
			IsActive = true
		);

		String csv =
			'Order Reference Number,Due Date,Delivery Group Name,Product Name,Quantity,Unit Type,Description,Width,Height,Depth,Notes\n' +
			'REF-001,2026-07-21,Group A,Import Product,2,Each,Imported line,10,20,5,Imported note\n' +
			'REF-001,2026-07-21,Group A,Import Product,1,Each,Imported line 2,10,20,5,Imported note 2\n' +
			'REF-001,2026-07-22,Group B,Import Product,3,Each,Imported line 3,10,20,5,Imported note 3\n';

		Test.startTest();
		OrderImportController.ImportResponse response = OrderImportController.importCsv(csv, accountRecord.Id);
		Test.stopTest();

		System.assertEquals(3, response.totalRows, 'Expected three data rows.');
		System.assertEquals(1, response.ordersCreated, 'Expected one created order.');
		System.assertEquals(3, response.orderItemsCreated, 'Expected three created order items.');
		System.assertEquals(0, response.failedRows, 'Expected no row failures.');
		System.assertEquals(1, response.createdOrderIds.size(), 'Expected one returned order id.');

		Order createdOrder = [
			SELECT Id, AccountId, Status, EffectiveDate, DueDate__c, PoNumber, Pricebook2Id
			FROM Order
			WHERE Id = :response.createdOrderIds[0]
			LIMIT 1
		];
		System.assertEquals(accountRecord.Id, createdOrder.AccountId, 'Order should map account by name lookup.');
		System.assertEquals('Draft', createdOrder.Status, 'Order status should default to Draft.');
		System.assertEquals('REF-001', createdOrder.PoNumber, 'Order reference number should come from CSV.');
		System.assertEquals(Date.newInstance(2026, 7, 21), createdOrder.EffectiveDate, 'Order effective date should use earliest due date.');
		System.assertEquals(Date.newInstance(2026, 7, 21), createdOrder.DueDate__c, 'Order due date should use earliest due date.');
		System.assertEquals(standardPricebookId, createdOrder.Pricebook2Id, 'Order should default to standard pricebook when not provided.');

		List<DeliveryGroup__c> groups = [
			SELECT Id, Name, DueDate__c, Order__c
			FROM DeliveryGroup__c
			WHERE Order__c = :createdOrder.Id
			ORDER BY DueDate__c, Name
		];
		System.assertEquals(2, groups.size(), 'Expected two delivery groups to be created.');
		System.assertEquals('Group A', groups[0].Name, 'First group should match Group A.');
		System.assertEquals(Date.newInstance(2026, 7, 21), groups[0].DueDate__c, 'Group A due date should be preserved.');
		System.assertEquals('Group B', groups[1].Name, 'Second group should match Group B.');
		System.assertEquals(Date.newInstance(2026, 7, 22), groups[1].DueDate__c, 'Group B due date should be preserved.');

		List<OrderItem> createdItems = [
			SELECT Id, OrderId, DeliveryGroup__c, Product2Id, Quantity, BasePrice__c, Description, UnitType__c, Notes__c, PricebookEntryId
			FROM OrderItem
			WHERE OrderId = :createdOrder.Id
			ORDER BY CreatedDate
		];
		System.assertEquals(3, createdItems.size(), 'Expected three imported order items.');
		System.assertEquals(productRecord.Id, createdItems[0].Product2Id, 'First order product should resolve Product by Name.');
		System.assertEquals(groups[0].Id, createdItems[0].DeliveryGroup__c, 'First order product should link to Group A.');
		System.assertEquals(2, createdItems[0].Quantity, 'First quantity should be imported.');
		System.assertEquals(100, createdItems[0].BasePrice__c, 'Base Price should come from product pricebook entry.');
		System.assertEquals('Imported line', createdItems[0].Description, 'First description should be imported.');
		System.assertEquals('Each', createdItems[0].UnitType__c, 'Unit type should be imported.');
		System.assertEquals('Imported note', createdItems[0].Notes__c, 'Notes should be imported.');
		System.assertNotEquals(null, createdItems[0].PricebookEntryId, 'Pricebook entry should be assigned by import logic.');
		System.assertEquals(groups[0].Id, createdItems[1].DeliveryGroup__c, 'Second item should share Group A.');
		System.assertEquals(groups[1].Id, createdItems[2].DeliveryGroup__c, 'Third item should link to Group B.');
	}

	@isTest
	static void importCsv_returnsRowErrorWhenProductLookupFails() {
		Account accountRecord = new Account(Name = 'Import Account 2');
		insert accountRecord;

		String csv =
			'Order Reference Number,Due Date,Delivery Group Name,Product Name,Quantity,Unit Type,Description,Width,Height,Depth,Notes\n' +
			'REF-002,2026-07-21,Group A,Unknown Product,1,Each,Line,1,1,1,Note\n';

		Test.startTest();
		OrderImportController.ImportResponse response = OrderImportController.importCsv(csv, accountRecord.Id);
		Test.stopTest();

		System.assertEquals(1, response.totalRows, 'Expected one data row.');
		System.assertEquals(0, response.ordersCreated, 'No order should be created when lookup fails.');
		System.assertEquals(0, response.orderItemsCreated, 'No order item should be created when lookup fails.');
		System.assert(response.failedRows > 0, 'Expected at least one failed row message.');
		System.assert(!response.rowErrors.isEmpty(), 'Expected row errors to be returned.');
	}

	@isTest
	static void getTemplate_returnsDefaultTemplate() {
		Test.startTest();
		OrderImportController.TemplateResponse response = OrderImportController.getTemplate();
		Test.stopTest();

		System.assertEquals('order-import-template.csv', response.fileName, 'Template filename should be stable.');
		System.assert(response.csvContent != null && response.csvContent.contains('Order Reference Number'), 'Template should include mapped headers.');
		System.assert(response.csvContent != null && response.csvContent.contains('Delivery Group Name'), 'Template should include delivery group headers.');
		System.assert(!response.csvContent.contains('Account Name'), 'Template should not include Account Name.');
		System.assert(!response.mappings.isEmpty(), 'Template should include active mappings.');
	}
}
