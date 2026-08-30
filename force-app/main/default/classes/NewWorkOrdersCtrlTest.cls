@isTest
private class NewWorkOrdersCtrlTest {
	@isTest
	static void testCreateWorkOrdersFromOrderItems() {
		Id stdPbId = Test.getStandardPricebookId();

		Pricebook2 stdPb = new Pricebook2(
			Id = stdPbId,
			IsActive = true
		);
		update stdPb;

		Pricebook2 testPb = new Pricebook2(
			Name = 'Test Price Book',
			IsActive = true
		);
		insert testPb;

		// Create test data
		Account acc = new Account(
			Name = 'Test Account'
		);
		insert acc;

		Product2 prod = new Product2(
			Name = 'Test Product',
			IsActive = true,
			Category__c = 'Other',
			RecordTypeId =
				Schema.SObjectType.Product2
					.getRecordTypeInfosByDeveloperName()
					.get('Product').getRecordTypeId()
		);
		insert prod;

		PricebookEntry stdPbe = new PricebookEntry(
			Product2Id = prod.Id,
			Pricebook2Id = stdPbId,
			UnitPrice = 100,
			IsActive = true
		);
		insert stdPbe;

		PricebookEntry pbe = new PricebookEntry(
			Product2Id = prod.Id,
			Pricebook2Id = testPb.Id,
			UnitPrice = 100,
			IsActive = true
		);
		insert pbe;

		Order ord = new Order(
			AccountId = acc.Id,
			Pricebook2Id = testPb.Id,
			EffectiveDate = Date.today(),
			Status = 'Draft'
		);
		insert ord;

		ord = [
			SELECT Id, Pricebook2Id
			FROM Order
			WHERE Id = :ord.Id
			LIMIT 1
		];

		Id orderPricebookEntryId =
			(ord.Pricebook2Id == testPb.Id) ? pbe.Id : stdPbe.Id;

		OrderItem oi = new OrderItem(
			OrderId = ord.Id,
			Product2Id = prod.Id,
			Quantity = 1,
			UnitPrice = 100,
			PricebookEntryId = orderPricebookEntryId
		);
		insert oi;

		// Prepare DTOs
		NewWorkOrdersCtrl.OrderProductDTO childItem =
			new NewWorkOrdersCtrl.OrderProductDTO();
		childItem.uniqueId = oi.Id;
		childItem.isPart = false;
		childItem.hasParts = false;
		childItem.items = new List<NewWorkOrdersCtrl.OrderProductDTO>();

		NewWorkOrdersCtrl.OrderProductDTO parentItem =
			new NewWorkOrdersCtrl.OrderProductDTO();
		parentItem.uniqueId = oi.Id;
		parentItem.orderId = ord.Id;
		parentItem.sopId = null;
		parentItem.materialId = null;
		parentItem.width = 10;
		parentItem.height = 20;
		parentItem.depth = 5;
		parentItem.qty = 1;
		parentItem.isPart = false;
		parentItem.hasParts = false;
		parentItem.workOrderAction = 'new';
		parentItem.items = new List<NewWorkOrdersCtrl.OrderProductDTO>{ childItem };

		List<NewWorkOrdersCtrl.OrderProductDTO> orderItems =
			new List<NewWorkOrdersCtrl.OrderProductDTO>{ parentItem };

		Test.startTest();
		List<NewWorkOrdersCtrl.OrderProductDTO> result =
			NewWorkOrdersCtrl.createWorkOrdersFromOrderItems(orderItems);
		Test.stopTest();

		System.assertNotEquals(null, result, 'Result should not be null');
		System.assertEquals(1, result.size(), 'Should return one DTO result');
		System.assertNotEquals(null, result[0].workOrderId,
			'Created workOrderId should be returned on the DTO.');

		WorkOrder createdWorkOrder = [
			SELECT Id, Order__c
			FROM WorkOrder
			WHERE Id = :result[0].workOrderId
			LIMIT 1
		];
		System.assertEquals(ord.Id, createdWorkOrder.Order__c,
			'Order__c should match the test Order Id');
	}

	@isTest
	static void testGetDefaultSopPerProductFromJunction() {
		Product2 prod = new Product2(
			Name = 'Default SOP Product',
			IsActive = true,
			Category__c = 'Other',
			RecordTypeId =
				Schema.SObjectType.Product2
					.getRecordTypeInfosByDeveloperName()
					.get('Product').getRecordTypeId()
		);
		insert prod;

		SOP__c sopA = new SOP__c(Name = 'SOP A');
		SOP__c sopB = new SOP__c(Name = 'SOP B');
		insert new List<SOP__c>{ sopA, sopB };

		insert new SopProduct__c(
			Product__c = prod.Id,
			SOP__c = sopA.Id,
			IsDefault__c = true
		);
		insert new SopProduct__c(
			Product__c = prod.Id,
			SOP__c = sopB.Id,
			IsDefault__c = true
		);

		Test.startTest();
		Map<Id, SOP__c> defaultsByProduct =
			NewWorkOrdersCtrl.getDefaultSopPerProduct(
				new List<Id>{ prod.Id }
			);
		Test.stopTest();

		System.assert(defaultsByProduct.containsKey(prod.Id),
			'Default SOP map should contain the product key.');
		System.assertNotEquals(null, defaultsByProduct.get(prod.Id),
			'Default SOP should be returned for the product.');
		System.assertNotEquals(null, defaultsByProduct.get(prod.Id).Id,
			'Returned default SOP must include an SOP Id.');
	}
}