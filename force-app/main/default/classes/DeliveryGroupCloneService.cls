/**
 * Shared cloning service for Delivery Groups and related line items.
 */
public with sharing class DeliveryGroupCloneService {

	public static void cloneOrderDeliveryGroupsAndItems(
		List<Order> targetOrders,
		List<Order> sourceOrders
	) {
		if (targetOrders == null || sourceOrders == null || targetOrders.isEmpty() || sourceOrders.isEmpty()) {
			return;
		}

		Map<Id, Id> sourceToTargetOrderId = new Map<Id, Id>();
		for (Integer i = 0; i < targetOrders.size() && i < sourceOrders.size(); i++) {
			if (targetOrders[i] != null && targetOrders[i].Id != null && sourceOrders[i] != null && sourceOrders[i].Id != null) {
				sourceToTargetOrderId.put(sourceOrders[i].Id, targetOrders[i].Id);
			}
		}

		if (sourceToTargetOrderId.isEmpty()) {
			return;
		}

		List<DeliveryGroup__c> sourceGroups = [
			SELECT Id,
				Name,
				DeliveryAddress__City__s,
				DeliveryAddress__CountryCode__s,
				DeliveryAddress__GeocodeAccuracy__s,
				DeliveryAddress__Latitude__s,
				DeliveryAddress__Longitude__s,
				DeliveryAddress__PostalCode__s,
				DeliveryAddress__StateCode__s,
				DeliveryAddress__Street__s,
				CreatedDate,
				DueDate__c,
				DeliveryType__c,
				DeliveryLocationType__c,
				PickupLocationType__c,
				Order__c,
				DeliveryCenter__c,
				PickupCenter__c,
				(
					SELECT Id,
						AvailableQuantity,
						BasePrice__c,
						DeliveryGroup__c,
						DeliveryType__c,
						Width__c,
						Height__c,
						Depth__c,
						Description,
						DiscountType__c,
						DiscountAmount__c,
						EndDate,
						ListPrice,
						Notes__c,
						Quantity,
						TotalPrice,
						UnitPrice,
						UnitType__c,
						WorkOrderStatus__c,
						OrderId,
						ParentOrderProduct__c,
						PricebookEntryId,
						Product2Id
					FROM OrderProducts__r
					ORDER BY CreatedDate ASC
				)
			FROM DeliveryGroup__c
			WHERE Order__c IN :sourceToTargetOrderId.keySet()
			ORDER BY CreatedDate ASC
		];

		Map<Id, DeliveryGroup__c> targetGroupBySourceGroupId = new Map<Id, DeliveryGroup__c>();
		Map<Id, List<OrderItem>> sourceItemsBySourceGroupId = new Map<Id, List<OrderItem>>();

		for (DeliveryGroup__c sourceGroup : sourceGroups) {
			DeliveryGroup__c targetGroup = sourceGroup.clone(false, true, false, false);
			targetGroup.Order__c = sourceToTargetOrderId.get(sourceGroup.Order__c);
			targetGroup.Opportunity__c = null;
			targetGroupBySourceGroupId.put(sourceGroup.Id, targetGroup);
			sourceItemsBySourceGroupId.put(sourceGroup.Id, sourceGroup.OrderProducts__r.deepClone(false, false, false));
		}

		if (!targetGroupBySourceGroupId.isEmpty()) {
			insert targetGroupBySourceGroupId.values();
		}

		List<OrderItem> itemsToInsert = new List<OrderItem>();
		List<Id> sourceItemIdsInOrder = new List<Id>();
		Map<Id, Id> sourceParentBySourceItemId = new Map<Id, Id>();

		for (Id sourceGroupId : targetGroupBySourceGroupId.keySet()) {
			DeliveryGroup__c targetGroup = targetGroupBySourceGroupId.get(sourceGroupId);
			for (OrderItem clonedItem : sourceItemsBySourceGroupId.get(sourceGroupId)) {
				Id sourceItemId = clonedItem.Id;
				Id sourceParentId = clonedItem.ParentOrderProduct__c;
				clonedItem.DeliveryGroup__c = targetGroup.Id;
				clonedItem.OrderId = targetGroup.Order__c;
				clonedItem.ParentOrderProduct__c = null;
				itemsToInsert.add(clonedItem);
				sourceItemIdsInOrder.add(sourceItemId);
				sourceParentBySourceItemId.put(sourceItemId, sourceParentId);
			}
		}

		List<OrderItem> sourceUngroupedDiscounts = [
			SELECT Id,
				AvailableQuantity,
				BasePrice__c,
				DeliveryGroup__c,
				DeliveryType__c,
				Width__c,
				Height__c,
				Depth__c,
				Description,
				DiscountType__c,
				DiscountAmount__c,
				EndDate,
				ListPrice,
				Notes__c,
				Quantity,
				TotalPrice,
				UnitPrice,
				UnitType__c,
				WorkOrderStatus__c,
				OrderId,
				ParentOrderProduct__c,
				PricebookEntryId,
				Product2Id
			FROM OrderItem
			WHERE OrderId IN :sourceToTargetOrderId.keySet()
			AND DeliveryGroup__c = null
			AND Product2.RecordType.DeveloperName = 'Discount'
			ORDER BY CreatedDate ASC
		];

		for (OrderItem sourceDiscount : sourceUngroupedDiscounts) {
			OrderItem clonedDiscount = sourceDiscount.clone(false, true, false, false);
			Id sourceItemId = clonedDiscount.Id;
			Id sourceParentId = clonedDiscount.ParentOrderProduct__c;
			clonedDiscount.OrderId = sourceToTargetOrderId.get(sourceDiscount.OrderId);
			clonedDiscount.DeliveryGroup__c = null;
			clonedDiscount.ParentOrderProduct__c = null;
			itemsToInsert.add(clonedDiscount);
			sourceItemIdsInOrder.add(sourceItemId);
			sourceParentBySourceItemId.put(sourceItemId, sourceParentId);
		}

		if (itemsToInsert.isEmpty()) {
			return;
		}

		insert itemsToInsert;

		Map<Id, Id> newItemIdBySourceItemId = new Map<Id, Id>();
		for (Integer i = 0; i < itemsToInsert.size(); i++) {
			newItemIdBySourceItemId.put(sourceItemIdsInOrder[i], itemsToInsert[i].Id);
		}

		List<OrderItem> parentUpdates = new List<OrderItem>();
		for (Id sourceItemId : sourceItemIdsInOrder) {
			Id sourceParentId = sourceParentBySourceItemId.get(sourceItemId);
			if (sourceParentId != null && newItemIdBySourceItemId.containsKey(sourceParentId)) {
				parentUpdates.add(new OrderItem(
					Id = newItemIdBySourceItemId.get(sourceItemId),
					ParentOrderProduct__c = newItemIdBySourceItemId.get(sourceParentId)
				));
			}
		}

		if (!parentUpdates.isEmpty()) {
			update parentUpdates;
		}
	}

	public static void cloneOpportunityDeliveryGroupsAndItems(
		List<Opportunity> targetOpportunities,
		List<Opportunity> sourceOpportunities
	) {
		if (
			targetOpportunities == null ||
			sourceOpportunities == null ||
			targetOpportunities.isEmpty() ||
			sourceOpportunities.isEmpty()
		) {
			return;
		}

		Map<Id, Id> sourceToTargetOpportunityId = new Map<Id, Id>();
		for (Integer i = 0; i < targetOpportunities.size() && i < sourceOpportunities.size(); i++) {
			if (
				targetOpportunities[i] != null && targetOpportunities[i].Id != null &&
				sourceOpportunities[i] != null && sourceOpportunities[i].Id != null
			) {
				sourceToTargetOpportunityId.put(sourceOpportunities[i].Id, targetOpportunities[i].Id);
			}
		}

		if (sourceToTargetOpportunityId.isEmpty()) {
			return;
		}

		List<DeliveryGroup__c> sourceGroups = [
			SELECT Id,
				Name,
				DeliveryAddress__City__s,
				DeliveryAddress__CountryCode__s,
				DeliveryAddress__GeocodeAccuracy__s,
				DeliveryAddress__Latitude__s,
				DeliveryAddress__Longitude__s,
				DeliveryAddress__PostalCode__s,
				DeliveryAddress__StateCode__s,
				DeliveryAddress__Street__s,
				CreatedDate,
				DueDate__c,
				DeliveryType__c,
				DeliveryLocationType__c,
				PickupLocationType__c,
				Opportunity__c,
				DeliveryCenter__c,
				PickupCenter__c,
				(
					SELECT Id,
						BasePrice__c,
						DeliveryGroup__c,
						DeliveryType__c,
						Width__c,
						Height__c,
						Depth__c,
						Description,
						DiscountType__c,
						DiscountAmount__c,
						ListPrice,
						Notes__c,
						OpportunityId,
						ParentOrderProduct__c,
						PricebookEntryId,
						Product2Id,
						Quantity,
						TotalPrice,
						UnitPrice,
						UnitType__c,
						WorkOrderStatus__c
					FROM OpportunityProducts__r
					ORDER BY CreatedDate ASC
				)
			FROM DeliveryGroup__c
			WHERE Opportunity__c IN :sourceToTargetOpportunityId.keySet()
			ORDER BY CreatedDate ASC
		];

		Map<Id, DeliveryGroup__c> targetGroupBySourceGroupId = new Map<Id, DeliveryGroup__c>();
		Map<Id, List<OpportunityLineItem>> sourceItemsBySourceGroupId =
			new Map<Id, List<OpportunityLineItem>>();

		for (DeliveryGroup__c sourceGroup : sourceGroups) {
			DeliveryGroup__c targetGroup = sourceGroup.clone(false, true, false, false);
			targetGroup.Opportunity__c = sourceToTargetOpportunityId.get(sourceGroup.Opportunity__c);
			targetGroup.Order__c = null;
			targetGroupBySourceGroupId.put(sourceGroup.Id, targetGroup);
			sourceItemsBySourceGroupId.put(sourceGroup.Id, sourceGroup.OpportunityProducts__r.deepClone(false, false, false));
		}

		if (!targetGroupBySourceGroupId.isEmpty()) {
			insert targetGroupBySourceGroupId.values();
		}

		List<OpportunityLineItem> itemsToInsert = new List<OpportunityLineItem>();
		List<Id> sourceItemIdsInOrder = new List<Id>();
		Map<Id, Id> sourceParentBySourceItemId = new Map<Id, Id>();

		for (Id sourceGroupId : targetGroupBySourceGroupId.keySet()) {
			DeliveryGroup__c targetGroup = targetGroupBySourceGroupId.get(sourceGroupId);
			for (OpportunityLineItem clonedItem : sourceItemsBySourceGroupId.get(sourceGroupId)) {
				Id sourceItemId = clonedItem.Id;
				Id sourceParentId = clonedItem.ParentOrderProduct__c;
				clonedItem.DeliveryGroup__c = targetGroup.Id;
				clonedItem.OpportunityId = targetGroup.Opportunity__c;
				clonedItem.ParentOrderProduct__c = null;
				clonedItem.TotalPrice = null;
				itemsToInsert.add(clonedItem);
				sourceItemIdsInOrder.add(sourceItemId);
				sourceParentBySourceItemId.put(sourceItemId, sourceParentId);
			}
		}

		List<OpportunityLineItem> sourceUngroupedDiscounts = [
			SELECT Id,
				BasePrice__c,
				DeliveryGroup__c,
				DeliveryType__c,
				Width__c,
				Height__c,
				Depth__c,
				Description,
				DiscountType__c,
				DiscountAmount__c,
				ListPrice,
				Notes__c,
				OpportunityId,
				ParentOrderProduct__c,
				PricebookEntryId,
				Product2Id,
				Quantity,
				TotalPrice,
				UnitPrice,
				UnitType__c,
				WorkOrderStatus__c
			FROM OpportunityLineItem
			WHERE OpportunityId IN :sourceToTargetOpportunityId.keySet()
			AND DeliveryGroup__c = null
			AND Product2.RecordType.DeveloperName = 'Discount'
			ORDER BY CreatedDate ASC
		];

		for (OpportunityLineItem sourceDiscount : sourceUngroupedDiscounts) {
			OpportunityLineItem clonedDiscount = sourceDiscount.clone(false, true, false, false);
			Id sourceItemId = clonedDiscount.Id;
			Id sourceParentId = clonedDiscount.ParentOrderProduct__c;
			clonedDiscount.OpportunityId = sourceToTargetOpportunityId.get(sourceDiscount.OpportunityId);
			clonedDiscount.DeliveryGroup__c = null;
			clonedDiscount.ParentOrderProduct__c = null;
			clonedDiscount.TotalPrice = null;
			itemsToInsert.add(clonedDiscount);
			sourceItemIdsInOrder.add(sourceItemId);
			sourceParentBySourceItemId.put(sourceItemId, sourceParentId);
		}

		if (itemsToInsert.isEmpty()) {
			return;
		}

		insert itemsToInsert;

		Map<Id, Id> newItemIdBySourceItemId = new Map<Id, Id>();
		for (Integer i = 0; i < itemsToInsert.size(); i++) {
			newItemIdBySourceItemId.put(sourceItemIdsInOrder[i], itemsToInsert[i].Id);
		}

		List<OpportunityLineItem> parentUpdates = new List<OpportunityLineItem>();
		for (Id sourceItemId : sourceItemIdsInOrder) {
			Id sourceParentId = sourceParentBySourceItemId.get(sourceItemId);
			if (sourceParentId != null && newItemIdBySourceItemId.containsKey(sourceParentId)) {
				parentUpdates.add(new OpportunityLineItem(
					Id = newItemIdBySourceItemId.get(sourceItemId),
					ParentOrderProduct__c = newItemIdBySourceItemId.get(sourceParentId)
				));
			}
		}

		if (!parentUpdates.isEmpty()) {
			update parentUpdates;
		}
	}
}
