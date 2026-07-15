@isTest
private class OpportunityOrderServiceTest {

	@isTest
	static void createOrderFromOpportunity_createsDraftOrder() {
		Account accountRecord = new Account(Name = 'Test Account');
		insert accountRecord;

		Opportunity opp = new Opportunity(
			Name = 'Test Opportunity',
			StageName = 'Prospecting',
			CloseDate = Date.today().addDays(7),
			AccountId = accountRecord.Id
		);
		insert opp;

		Test.startTest();
		List<OpportunityOrderService.Result> results =
			OpportunityOrderService.createOrdersFromOpportunities(new Set<Id>{ opp.Id });
		Test.stopTest();

		System.assertEquals(1, results.size(), 'Expected one result');
		System.assertEquals(true, results[0].success, 'Expected successful creation. Error: ' + results[0].message);
		System.assertNotEquals(null, results[0].orderId, 'Expected created Order Id');

		Order createdOrder = [
			SELECT Id, OpportunityId, AccountId, Status, EffectiveDate
			FROM Order
			WHERE Id = :results[0].orderId
		];
		System.assertEquals(opp.Id, createdOrder.OpportunityId, 'Order should reference Opportunity');
		System.assertEquals(accountRecord.Id, createdOrder.AccountId, 'Order should reference Account');
		System.assertEquals('Draft', createdOrder.Status, 'Order should be created as Draft');
		System.assertEquals(opp.CloseDate, createdOrder.EffectiveDate, 'EffectiveDate should mirror Opportunity CloseDate');
	}

	@isTest
	static void invocable_createsOrder() {
		Account accountRecord = new Account(Name = 'Flow Test Account');
		insert accountRecord;

		Opportunity opp = new Opportunity(
			Name = 'Flow Test Opportunity',
			StageName = 'Prospecting',
			CloseDate = Date.today().addDays(1),
			AccountId = accountRecord.Id
		);
		insert opp;

		CreateOrderFromOpportunityInvocable.Request req = new CreateOrderFromOpportunityInvocable.Request();
		req.opportunityId = opp.Id;

		Test.startTest();
		List<CreateOrderFromOpportunityInvocable.Response> responses =
			CreateOrderFromOpportunityInvocable.createOrders(
				new List<CreateOrderFromOpportunityInvocable.Request>{ req }
			);
		Test.stopTest();

		System.assertEquals(1, responses.size(), 'Expected one response');
		System.assertEquals(true, responses[0].success, 'Expected successful response. Error: ' + responses[0].message);
		System.assertNotEquals(null, responses[0].orderId, 'Expected created Order Id from invocable');
	}

	@isTest
	static void createOrderFromOpportunity_clonesDeliveryGroupsAndOrderItems() {
		Id standardPricebookId = Test.getStandardPricebookId();

		Account accountRecord = new Account(Name = 'Clone Account');
		insert accountRecord;

		Product2 productRecord = new Product2(
			Name = 'Clone Product',
			IsActive = true,
			Category__c = 'Other',
			RecordTypeId = Schema.SObjectType.Product2
				.getRecordTypeInfosByDeveloperName()
				.get('Product')
				.getRecordTypeId()
		);
		insert productRecord;

		PricebookEntry pbe = new PricebookEntry(
			Product2Id = productRecord.Id,
			Pricebook2Id = standardPricebookId,
			UnitPrice = 100,
			IsActive = true
		);
		insert pbe;

		Opportunity opp = new Opportunity(
			Name = 'Clone Opportunity',
			StageName = 'Prospecting',
			CloseDate = Date.today().addDays(7),
			AccountId = accountRecord.Id,
			Pricebook2Id = standardPricebookId
		);
		insert opp;

		Id opportunityDeliveryGroupRtId = null;
		Map<String, Schema.RecordTypeInfo> rtInfoByName =
			Schema.SObjectType.DeliveryGroup__c.getRecordTypeInfosByDeveloperName();
		if (rtInfoByName.containsKey('Opportunity')) {
			opportunityDeliveryGroupRtId = rtInfoByName.get('Opportunity').getRecordTypeId();
		}

		DeliveryGroup__c sourceGroup = new DeliveryGroup__c(
			Name = 'Source Group',
			Opportunity__c = opp.Id,
			DeliveryType__c = 'Delivery'
		);
		if (opportunityDeliveryGroupRtId != null) {
			sourceGroup.RecordTypeId = opportunityDeliveryGroupRtId;
		}
		insert sourceGroup;

		OpportunityLineItem sourceItem = new OpportunityLineItem(
			OpportunityId = opp.Id,
			PricebookEntryId = pbe.Id,
			Product2Id = productRecord.Id,
			Quantity = 2,
			UnitPrice = 125,
			BasePrice__c = 125,
			UnitType__c = 'Each',
			DeliveryGroup__c = sourceGroup.Id,
			Description = 'Cloned from opportunity line item'
		);
		insert sourceItem;

		Test.startTest();
		List<OpportunityOrderService.Result> results =
			OpportunityOrderService.createOrdersFromOpportunities(new Set<Id>{ opp.Id });
		Test.stopTest();

		System.assertEquals(1, results.size(), 'Expected one result');
		System.assertEquals(true, results[0].success, 'Order and related records should be created. Error: ' + results[0].message);
		System.assertNotEquals(null, results[0].orderId, 'Expected created Order Id');

		List<DeliveryGroup__c> targetGroups = [
			SELECT Id, Opportunity__c, Order__c, Name
			FROM DeliveryGroup__c
			WHERE Order__c = :results[0].orderId
		];
		System.assert(targetGroups.size() >= 1, 'Expected at least one delivery group in the new order');

		DeliveryGroup__c clonedGroup;
		for (DeliveryGroup__c groupRecord : targetGroups) {
			if (groupRecord.Name == 'Source Group') {
				clonedGroup = groupRecord;
				break;
			}
		}
		System.assertNotEquals(null, clonedGroup, 'Expected cloned delivery group from opportunity');
		System.assertEquals(null, clonedGroup.Opportunity__c, 'Cloned group should no longer point to Opportunity');

		List<OrderItem> clonedOrderItems = [
			SELECT Id, OrderId, DeliveryGroup__c, Quantity, UnitPrice, Description, PricebookEntryId
			FROM OrderItem
			WHERE OrderId = :results[0].orderId
		];
		System.assertEquals(1, clonedOrderItems.size(), 'Expected one cloned order item');
		System.assertEquals(clonedGroup.Id, clonedOrderItems[0].DeliveryGroup__c, 'Order item should point to cloned delivery group');
		System.assertEquals(2, clonedOrderItems[0].Quantity, 'Quantity should be cloned');
		System.assertEquals(125, clonedOrderItems[0].UnitPrice, 'Unit price should be cloned');
		System.assertEquals('Cloned from opportunity line item', clonedOrderItems[0].Description, 'Description should be cloned');
		System.assertEquals(pbe.Id, clonedOrderItems[0].PricebookEntryId, 'Pricebook entry should be cloned');
	}
}
