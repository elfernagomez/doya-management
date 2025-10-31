@isTest
private class NewWorkOrdersCtrlTest {
	@isTest
	static void testCreateWorkOrdersFromOrderItems() {
		Id stdPbId = Test.getStandardPricebookId();

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

		PricebookEntry pbe = new PricebookEntry(
			Product2Id = prod.Id,
			Pricebook2Id = stdPbId,
			UnitPrice = 100,
			IsActive = true
		);
		insert pbe;

		Order ord = new Order(
			AccountId = acc.Id,
			Pricebook2Id = stdPbId,
			EffectiveDate = Date.today(),
			Status = 'Draft'
		);
		insert ord;

		OrderItem oi = new OrderItem(
			OrderId = ord.Id,
			Product2Id = prod.Id,
			Quantity = 1,
			UnitPrice = 100,
			PricebookEntryId = pbe.Id
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
		parentItem.items = new List<NewWorkOrdersCtrl.OrderProductDTO>{ childItem };

		List<NewWorkOrdersCtrl.OrderProductDTO> orderItems =
			new List<NewWorkOrdersCtrl.OrderProductDTO>{ parentItem };

		Test.startTest();
		List<WorkOrder> workOrders =
			NewWorkOrdersCtrl.createWorkOrdersFromOrderItems(orderItems);
		Test.stopTest();

		System.assertNotEquals(null, workOrders, 'WorkOrders should not be null');
		System.assertEquals(1, workOrders.size(), 'Should create one WorkOrder');
		System.assertEquals(ord.Id, workOrders[0].Order__c, 'Order__c should match the test Order Id');
	}
}