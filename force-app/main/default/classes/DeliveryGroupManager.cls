/**
 * Common read/write method involving the Delivery Group object.
 * @author Fernando Gomez
 * @version 1.0 9/15/2024
 */
public with sharing class DeliveryGroupManager {
	/* public DeliveryGroupManager() {

	} */

	/**
	 * @param orderIds
	 * @return Map<Id, List<DeliveryGroup__c>>
	 */
	public static Map<Id, List<DeliveryGroup__c>> getDeliveryGroups(List<Id> orderIds) {
		List<DeliveryGroup__c> groups;
		Map<Id, List<DeliveryGroup__c>> result =
			new Map<Id, List<DeliveryGroup__c>>();

		for (Id orderId : orderIds)
			result.put(orderId, new List<DeliveryGroup__c>());

		groups = [
			SELECT Name,
				AddressLabel__c,
				AddressHtml__c,
				Address__City__s,
				Address__CountryCode__s,
				Address__GeocodeAccuracy__s,
				Address__Latitude__s,
				Address__Longitude__s,
				Address__PostalCode__s,
				Address__StateCode__s,
				Address__Street__s,
				DueDate__c,
				DeliveryType__c,
				LocationType__c,
				Order__c,
				Venue__c,
				Venue__r.Name,
				(
					SELECT AvailableQuantity,
						BasePrice__c,
						CreatedDate,
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
						OrderId,
						PricebookEntryId,
						Product2Id,
						Product2.Name,
						Product2.ProductCode,
						Product2.Finish__c,
						Product2.Material__c,
						Product2.Material__r.Name,
						Product2.RecordTypeId,
						Product2.RecordType.DeveloperName
					FROM OrderProducts__r
					ORDER BY CreatedDate
				)
			FROM DeliveryGroup__c
			WHERE Order__c = :orderIds
			ORDER BY DueDate__c NULLS LAST, CreatedDate
		];

		for (DeliveryGroup__c g : groups)
			result.get(g.Order__c).add(g);

		return result;
	}

	/**
	 * @param newOrders
	 * @param sourceOrders
	 */
	public static void clone(List<Order> newOrders, List<Order> sourceOrders) {
		List<DeliveryGroup__c> sourceGroups;
		DeliveryGroup__c sourceGroup;
		DeliveryGroup__c targetGroup;
		Order newOrder;
		Order sourceOrder;

		Map<Id, Order> sourceOrdersMap = new Map<Id, Order>(sourceOrders);
		Map<Id, Order> newOrdersBySourceIdMap = new Map<Id, Order>();
		List<OrderItem> newOrderedProducts = new List<OrderItem>();
		Map<Id, DeliveryGroup__c> sourceGroupBySourceId =
			new Map<Id, DeliveryGroup__c>();
		Map<Id, DeliveryGroup__c> targetGroupBySourceId =
			new Map<Id, DeliveryGroup__c>();
		Map<Id, List<OrderItem>> newOrderProductsBySourceIdMap =
			new Map<Id, List<OrderItem>>();

		// we link new order to source orders in the map
		for (Integer i = 0; i < newOrders.size(); i++) {
			newOrder = newOrders[i];
			sourceOrder = sourceOrders[i];
			newOrdersBySourceIdMap.put(sourceOrder.Id, newOrder);
		}

		sourceGroups = [
			SELECT Name,
				Address__City__s,
				Address__CountryCode__s,
				Address__GeocodeAccuracy__s,
				Address__Latitude__s,
				Address__Longitude__s,
				Address__PostalCode__s,
				Address__StateCode__s,
				Address__Street__s,
				DueDate__c,
				DeliveryType__c,
				LocationType__c,
				Order__c,
				Venue__c,
				(
					SELECT AvailableQuantity,
						BasePrice__c,
						DeliveryGroup__c,
						DeliveryType__c,
						Width__c,
						Height__c,
						Depth__c,
						Description,
						EndDate,
						ListPrice,
						Notes__c,
						Quantity,
						TotalPrice,
						UnitPrice,
						UnitType__c,
						OrderId,
						PricebookEntryId,
						Product2Id
					FROM OrderProducts__r
				)
			FROM DeliveryGroup__c
			WHERE Order__c IN :sourceOrdersMap.keySet()
		];

		// we clone all delivery groups
		for (DeliveryGroup__c sg : sourceGroups) {
			newOrder = newOrdersBySourceIdMap.get(sg.Order__c);
			sourceOrder = sourceOrdersMap.get(sg.Order__c);
			targetGroup = sg.clone(false, true, false, false);
			// fields to modify
			targetGroup.Order__c = newOrder.Id;
			sourceGroupBySourceId.put(sg.Id, sg);
			targetGroupBySourceId.put(sg.Id, targetGroup);
			// we clone the products as well
			// and we map the products to find them after insert
			newOrderProductsBySourceIdMap.put(
				sg.Id,
				sg.OrderProducts__r.deepClone(false, false, false));
		}

		// targetGroups
		insert targetGroupBySourceId.values();

		// we then fix the ids of the new order products
		for (Id sourceId : targetGroupBySourceId.keySet()) {
			sourceGroup = sourceGroupBySourceId.get(sourceId);
			targetGroup = targetGroupBySourceId.get(sourceId);

			for (OrderItem item : newOrderProductsBySourceIdMap.get(sourceId)) {
				item.DeliveryGroup__c = targetGroup.Id;
				item.OrderId = targetGroup.Order__c;
				newOrderedProducts.add(item);
			}
		}

		insert newOrderedProducts;
	}

	@AuraEnabled
	public static Id clone(Id deliveryGroupId, String newName) {
		DeliveryGroup__c sourceGroup;
		DeliveryGroup__c targetGroup;
		List<OrderItem> newOrderProducts;
		OrderItem targetOrderProduct;

		try {
			sourceGroup = [
				SELECT Address__City__s,
					Address__CountryCode__s,
					Address__GeocodeAccuracy__s,
					Address__Latitude__s,
					Address__Longitude__s,
					Address__PostalCode__s,
					Address__StateCode__s,
					Address__Street__s,
					DueDate__c,
					DeliveryType__c,
					LocationType__c,
					Order__c,
					Venue__c,
					(
						SELECT AvailableQuantity,
							BasePrice__c,
							DeliveryGroup__c,
							DeliveryType__c,
							Width__c,
							Height__c,
							Depth__c,
							Description,
							EndDate,
							ListPrice,
							Notes__c,
							OrderId,
							PricebookEntryId,
							Product2Id,
							Quantity,
							TotalPrice,
							UnitPrice,
							UnitType__c
						FROM OrderProducts__r
					)
				FROM DeliveryGroup__c
				WHERE Id = :deliveryGroupId
			];

			targetGroup = sourceGroup.clone(false, true, false, false);
			targetGroup.Name = newName;
			insert targetGroup;

			if (!sourceGroup.OrderProducts__r.isEmpty()) {
				newOrderProducts = new List<OrderItem>();

				for (OrderItem sourceOrderProduct : sourceGroup.OrderProducts__r) {
					targetOrderProduct =
						sourceOrderProduct.clone(false, true, false, false);
					targetOrderProduct.DeliveryGroup__c = targetGroup.Id;
					newOrderProducts.add(targetOrderProduct);
				}

				insert newOrderProducts;
			}

			return targetGroup.Id;
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}
}