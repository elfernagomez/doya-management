/**
 * Reusable bulkified service to create Orders from Opportunities.
 */
public with sharing class OpportunityOrderService {

	public class Result {
		public Id opportunityId;
		public Id orderId;
		public Boolean success;
		public String message;
	}

	public static List<Result> createOrdersFromOpportunities(Set<Id> opportunityIds) {
		if (opportunityIds == null || opportunityIds.isEmpty()) {
			return new List<Result>();
		}

		Map<Id, Opportunity> opportunitiesById = new Map<Id, Opportunity>([
			SELECT Id, AccountId, Pricebook2Id, CloseDate
			FROM Opportunity
			WHERE Id IN :opportunityIds
		]);

		Map<Id, Order> existingOrderByOpportunityId = new Map<Id, Order>();
		for (Order orderRecord : [
			SELECT Id, OpportunityId
			FROM Order
			WHERE OpportunityId IN :opportunityIds
		]) {
			if (!existingOrderByOpportunityId.containsKey(orderRecord.OpportunityId)) {
				existingOrderByOpportunityId.put(orderRecord.OpportunityId, orderRecord);
			}
		}

		List<Order> ordersToInsert = new List<Order>();
		List<Id> orderOpportunitySequence = new List<Id>();
		Map<Id, Result> resultByOpportunityId = new Map<Id, Result>();
		Map<Id, Id> newOrderIdByOpportunityId = new Map<Id, Id>();

		for (Id opportunityId : opportunityIds) {
			Result result = new Result();
			result.opportunityId = opportunityId;
			result.success = false;

			Opportunity opp = opportunitiesById.get(opportunityId);
			if (opp == null) {
				result.message = 'Opportunity not found.';
				resultByOpportunityId.put(opportunityId, result);
				continue;
			}

			if (existingOrderByOpportunityId.containsKey(opportunityId)) {
				result.orderId = existingOrderByOpportunityId.get(opportunityId).Id;
				result.success = true;
				result.message = 'Order already exists for this Opportunity.';
				resultByOpportunityId.put(opportunityId, result);
				continue;
			}

			if (opp.AccountId == null) {
				result.message = 'Opportunity must have an Account to create an Order.';
				resultByOpportunityId.put(opportunityId, result);
				continue;
			}

			Order orderToCreate = new Order();
			orderToCreate.AccountId = opp.AccountId;
			orderToCreate.OpportunityId = opp.Id;
			orderToCreate.EffectiveDate = opp.CloseDate == null ? Date.today() : opp.CloseDate;
			orderToCreate.Status = 'Draft';
			if (opp.Pricebook2Id != null) {
				orderToCreate.Pricebook2Id = opp.Pricebook2Id;
			}

			ordersToInsert.add(orderToCreate);
			orderOpportunitySequence.add(opportunityId);
		}

		if (!ordersToInsert.isEmpty()) {
			Database.SaveResult[] dmlResults = Database.insert(ordersToInsert, false);
			for (Integer i = 0; i < dmlResults.size(); i++) {
				Id opportunityId = orderOpportunitySequence[i];
				Database.SaveResult saveResult = dmlResults[i];

				Result result = new Result();
				result.opportunityId = opportunityId;
				if (saveResult.isSuccess()) {
					result.orderId = saveResult.getId();
					result.success = true;
					result.message = 'Order created.';
					newOrderIdByOpportunityId.put(opportunityId, saveResult.getId());
				} else {
					result.success = false;
					result.message = saveResult.getErrors()[0].getMessage();
				}
				resultByOpportunityId.put(opportunityId, result);
			}
		}

		if (!newOrderIdByOpportunityId.isEmpty()) {
			cloneOpportunityDataToOrder(newOrderIdByOpportunityId, opportunitiesById, resultByOpportunityId);
		}

		List<Result> results = new List<Result>();
		List<Id> orderedOpportunityIds = new List<Id>(opportunityIds);
		orderedOpportunityIds.sort();
		for (Id opportunityId : orderedOpportunityIds) {
			if (resultByOpportunityId.containsKey(opportunityId)) {
				results.add(resultByOpportunityId.get(opportunityId));
			}
		}

		return results;
	}

	private static void cloneOpportunityDataToOrder(
		Map<Id, Id> orderIdByOpportunityId,
		Map<Id, Opportunity> opportunitiesById,
		Map<Id, Result> resultByOpportunityId
	) {
		Map<Id, Id> deliveryGroupIdMap = cloneOpportunityDeliveryGroups(orderIdByOpportunityId, resultByOpportunityId);
		createOrderItemsFromOpportunityLineItems(orderIdByOpportunityId, opportunitiesById, deliveryGroupIdMap, resultByOpportunityId);
	}

	private static void ensureOrderPricebooks(
		Map<Id, Id> orderIdByOpportunityId,
		Map<Id, Opportunity> opportunitiesById,
		Map<Id, Result> resultByOpportunityId
	) {
		if (orderIdByOpportunityId.isEmpty()) {
			return;
		}

		Map<Id, Order> ordersById = new Map<Id, Order>([
			SELECT Id, Pricebook2Id
			FROM Order
			WHERE Id IN :orderIdByOpportunityId.values()
		]);

		Id standardPricebookId = getStandardPricebookId();
		List<Order> ordersToUpdate = new List<Order>();
		List<Id> orderOpportunityIdsInOrder = new List<Id>();

		for (Id opportunityId : orderIdByOpportunityId.keySet()) {
			Order orderRecord = ordersById.get(orderIdByOpportunityId.get(opportunityId));
			if (orderRecord == null || orderRecord.Pricebook2Id != null) {
				continue;
			}

			Id pricebookId = opportunitiesById.containsKey(opportunityId)
				? opportunitiesById.get(opportunityId).Pricebook2Id
				: null;
			if (pricebookId == null) {
				pricebookId = standardPricebookId;
			}

			if (pricebookId == null) {
				appendResultMessage(
					resultByOpportunityId.get(opportunityId),
					'No active price book found to update the created order.'
				);
				continue;
			}

			ordersToUpdate.add(new Order(
				Id = orderRecord.Id,
				Pricebook2Id = pricebookId
			));
			orderOpportunityIdsInOrder.add(opportunityId);
		}

		if (ordersToUpdate.isEmpty()) {
			return;
		}

		Database.SaveResult[] updateResults = Database.update(ordersToUpdate, false);
		for (Integer i = 0; i < updateResults.size(); i++) {
			if (!updateResults[i].isSuccess()) {
				appendResultMessage(
					resultByOpportunityId.get(orderOpportunityIdsInOrder[i]),
					'Order price book update failed: ' + updateResults[i].getErrors()[0].getMessage()
				);
			}
		}
	}

	private static Map<Id, Id> cloneOpportunityDeliveryGroups(
		Map<Id, Id> orderIdByOpportunityId,
		Map<Id, Result> resultByOpportunityId
	) {
		Map<Id, Id> sourceToTargetDeliveryGroupId = new Map<Id, Id>();
		if (orderIdByOpportunityId.isEmpty()) {
			return sourceToTargetDeliveryGroupId;
		}

		List<DeliveryGroup__c> sourceGroups = [
			SELECT Id,
				RecordTypeId,
				Name,
				AddressLabel__c,
				DeliveryAddressHtml__c,
				PickupAddressHtml__c,
				DueDate__c,
				DeliveryType__c,
				DeliveryLocationType__c,
				PickupLocationType__c,
				DeliveryCenter__c,
				PickupCenter__c,
				Opportunity__c,
				Notes__c
			FROM DeliveryGroup__c
			WHERE Opportunity__c IN :orderIdByOpportunityId.keySet()
			ORDER BY CreatedDate ASC
		];

		if (sourceGroups.isEmpty()) {
			return sourceToTargetDeliveryGroupId;
		}

		Id orderDeliveryGroupRecordTypeId = getOrderDeliveryGroupRecordTypeId();
		List<DeliveryGroup__c> groupsToInsert = new List<DeliveryGroup__c>();
		List<Id> sourceGroupIdsInOrder = new List<Id>();
		List<Id> sourceOpportunityIdsInOrder = new List<Id>();

		for (DeliveryGroup__c sourceGroup : sourceGroups) {
			Id orderId = orderIdByOpportunityId.get(sourceGroup.Opportunity__c);
			if (orderId == null) {
				continue;
			}

			DeliveryGroup__c targetGroup = sourceGroup.clone(false, true, false, false);
			targetGroup.Opportunity__c = null;
			targetGroup.Order__c = orderId;
			if (orderDeliveryGroupRecordTypeId != null) {
				targetGroup.RecordTypeId = orderDeliveryGroupRecordTypeId;
			}

			groupsToInsert.add(targetGroup);
			sourceGroupIdsInOrder.add(sourceGroup.Id);
			sourceOpportunityIdsInOrder.add(sourceGroup.Opportunity__c);
		}

		if (groupsToInsert.isEmpty()) {
			return sourceToTargetDeliveryGroupId;
		}

		Database.SaveResult[] groupResults = Database.insert(groupsToInsert, false);
		for (Integer i = 0; i < groupResults.size(); i++) {
			Id sourceGroupId = sourceGroupIdsInOrder[i];
			Database.SaveResult saveResult = groupResults[i];

			if (saveResult.isSuccess()) {
				sourceToTargetDeliveryGroupId.put(sourceGroupId, saveResult.getId());
			} else {
				Id sourceOpportunityId = sourceOpportunityIdsInOrder[i];
				appendResultMessage(resultByOpportunityId.get(sourceOpportunityId),
					'Delivery group clone failed: ' + saveResult.getErrors()[0].getMessage());
			}
		}

		return sourceToTargetDeliveryGroupId;
	}

	private static void createOrderItemsFromOpportunityLineItems(
		Map<Id, Id> orderIdByOpportunityId,
		Map<Id, Opportunity> opportunitiesById,
		Map<Id, Id> deliveryGroupIdMap,
		Map<Id, Result> resultByOpportunityId
	) {
		if (orderIdByOpportunityId.isEmpty()) {
			return;
		}

		List<OpportunityLineItem> opportunityLineItems = [
			SELECT Id,
				OpportunityId,
				BasePrice__c,
				DeliveryType__c,
				Width__c,
				Height__c,
				Depth__c,
				Description,
				DiscountType__c,
				DiscountAmount__c,
				Notes__c,
				Quantity,
				UnitPrice,
				UnitType__c,
				WorkOrderStatus__c,
				DeliveryGroup__c,
				PricebookEntryId,
				Product2Id,
				ParentOrderProduct__c
			FROM OpportunityLineItem
			WHERE OpportunityId IN :orderIdByOpportunityId.keySet()
			ORDER BY CreatedDate ASC
		];

		if (opportunityLineItems.isEmpty()) {
			return;
		}

		Set<Id> opportunityIdsWithLineItems = new Set<Id>();
		for (OpportunityLineItem sourceItem : opportunityLineItems) {
			opportunityIdsWithLineItems.add(sourceItem.OpportunityId);
		}

		Map<Id, Id> lineItemOrderMap = new Map<Id, Id>();
		for (Id opportunityId : opportunityIdsWithLineItems) {
			if (orderIdByOpportunityId.containsKey(opportunityId)) {
				lineItemOrderMap.put(opportunityId, orderIdByOpportunityId.get(opportunityId));
			}
		}

		ensureOrderPricebooks(lineItemOrderMap, opportunitiesById, resultByOpportunityId);

		List<OrderItem> itemsToInsert = new List<OrderItem>();
		List<Id> sourceOliIdsInOrder = new List<Id>();
		List<Id> sourceOpportunityIdsInOrder = new List<Id>();
		Map<Id, Id> sourceParentBySourceOliId = new Map<Id, Id>();

		for (OpportunityLineItem sourceItem : opportunityLineItems) {
			Id orderId = orderIdByOpportunityId.get(sourceItem.OpportunityId);
			if (orderId == null) {
				continue;
			}

			OrderItem targetItem = new OrderItem();
			targetItem.OrderId = orderId;
			targetItem.PricebookEntryId = sourceItem.PricebookEntryId;
			targetItem.DeliveryGroup__c = deliveryGroupIdMap.get(sourceItem.DeliveryGroup__c);
			targetItem.BasePrice__c = sourceItem.BasePrice__c;
			targetItem.DeliveryType__c = sourceItem.DeliveryType__c;
			targetItem.Width__c = sourceItem.Width__c;
			targetItem.Height__c = sourceItem.Height__c;
			targetItem.Depth__c = sourceItem.Depth__c;
			targetItem.Description = sourceItem.Description;
			targetItem.DiscountType__c = sourceItem.DiscountType__c;
			targetItem.DiscountAmount__c = sourceItem.DiscountAmount__c;
			targetItem.Notes__c = sourceItem.Notes__c;
			targetItem.Quantity = sourceItem.Quantity == null ? 1 : sourceItem.Quantity;
			targetItem.UnitPrice = sourceItem.UnitPrice == null
				? (sourceItem.BasePrice__c == null ? 0.01 : sourceItem.BasePrice__c)
				: sourceItem.UnitPrice;
			targetItem.UnitType__c = sourceItem.UnitType__c;
			targetItem.WorkOrderStatus__c = sourceItem.WorkOrderStatus__c;

			itemsToInsert.add(targetItem);
			sourceOliIdsInOrder.add(sourceItem.Id);
			sourceOpportunityIdsInOrder.add(sourceItem.OpportunityId);
			sourceParentBySourceOliId.put(sourceItem.Id, sourceItem.ParentOrderProduct__c);
		}

		if (itemsToInsert.isEmpty()) {
			return;
		}

		Database.SaveResult[] insertResults = Database.insert(itemsToInsert, false);
		Map<Id, Id> orderItemIdBySourceOliId = new Map<Id, Id>();

		for (Integer i = 0; i < insertResults.size(); i++) {
			Id sourceOliId = sourceOliIdsInOrder[i];
			Database.SaveResult saveResult = insertResults[i];
			Id sourceOpportunityId = sourceOpportunityIdsInOrder[i];

			if (saveResult.isSuccess()) {
				orderItemIdBySourceOliId.put(sourceOliId, saveResult.getId());
			} else {
				appendResultMessage(
					resultByOpportunityId.get(sourceOpportunityId),
					'Order item clone failed: ' + saveResult.getErrors()[0].getMessage()
				);
			}
		}

		List<OrderItem> parentUpdates = new List<OrderItem>();
		List<Id> parentUpdateOpportunityIds = new List<Id>();
		for (Id sourceOliId : sourceOliIdsInOrder) {
			Id sourceParentOliId = sourceParentBySourceOliId.get(sourceOliId);
			Id createdOrderItemId = orderItemIdBySourceOliId.get(sourceOliId);
			Id createdParentOrderItemId = orderItemIdBySourceOliId.get(sourceParentOliId);

			if (createdOrderItemId != null && createdParentOrderItemId != null) {
				parentUpdates.add(new OrderItem(
					Id = createdOrderItemId,
					ParentOrderProduct__c = createdParentOrderItemId
				));
				parentUpdateOpportunityIds.add(sourceOpportunityIdsInOrder[sourceOliIdsInOrder.indexOf(sourceOliId)]);
			}
		}

		if (!parentUpdates.isEmpty()) {
			Database.SaveResult[] updateResults = Database.update(parentUpdates, false);
			for (Integer i = 0; i < updateResults.size(); i++) {
				if (!updateResults[i].isSuccess()) {
					appendResultMessage(
						resultByOpportunityId.get(parentUpdateOpportunityIds[i]),
						'Order item parent mapping failed: ' + updateResults[i].getErrors()[0].getMessage()
					);
				}
			}
		}
	}

	private static Id getOrderDeliveryGroupRecordTypeId() {
		Map<String, Schema.RecordTypeInfo> recordTypeByName =
			Schema.SObjectType.DeliveryGroup__c.getRecordTypeInfosByDeveloperName();

		if (recordTypeByName != null && recordTypeByName.containsKey('Order')) {
			return recordTypeByName.get('Order').getRecordTypeId();
		}

		return null;
	}

	private static Id getStandardPricebookId() {
		List<Pricebook2> standardPricebook = [
			SELECT Id
			FROM Pricebook2
			WHERE IsStandard = true
			AND IsActive = true
			LIMIT 1
		];

		return standardPricebook.isEmpty() ? null : standardPricebook[0].Id;
	}

	private static void appendResultMessage(Result result, String messageToAppend) {
		if (result == null || String.isBlank(messageToAppend)) {
			return;
		}

		if (String.isBlank(result.message)) {
			result.message = messageToAppend;
		} else {
			result.message += ' ' + messageToAppend;
		}
		result.success = false;
	}
}
