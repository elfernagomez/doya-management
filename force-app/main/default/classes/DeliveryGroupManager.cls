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

		for (Id orderId : orderIds){
			result.put(orderId, new List<DeliveryGroup__c>());
		}

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
				DeliveryCenter__c,
				DeliveryCenter__r.Name,
				(
					SELECT Name,
						Description__c,
						TrackingNumber__c
					FROM PackingSlips__r
					ORDER BY Name
				),
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
						WorkOrderStatus__c,
						OrderId,
						PricebookEntryId,
						ParentOrderProduct__c,
						ParentOrderProduct__r.Product2.Name,
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

		for (DeliveryGroup__c g : groups) {
			result.get(g.Order__c).add(g);
		}

		return result;
	}

	/**
	 * Returns delivery groups (with their order products) for the specified Order Id.
	 * @param orderId Id of the order
	 * @return List<DeliveryGroup__c>
	 */
	@AuraEnabled(cacheable=true)
	public static List<DeliveryGroup__c> getDeliveryGroupsByOrder(Id orderId) {
		try {
			if (orderId == null) {
				return new List<DeliveryGroup__c>();
			}

			return getDeliveryGroups(new List<Id> { orderId }).get(orderId);
		} catch (Exception ex) {
			throw new AuraHandledException(ex.getMessage());
		}
	}


	/**
	 * Returns delivery groups (with their order products) that contain order items
	 * linked to the specified Work Order Id.
	 * @param workOrderId Id of the work order
	 * @return List<DeliveryGroup__c> with OrderProducts__r filtered to the work order
	 */
	@AuraEnabled(cacheable=true)
	public static List<DeliveryGroup__c> getDeliveryGroupsByWorkOrder(Id workOrderId) {
		try {
			if (workOrderId == null) {
				return new List<DeliveryGroup__c>();
			}
			// get linking records to determine delivery groups 
			// and order items to include
			List<OrderItemWorkOrder__c> links = [
				SELECT OrderItem__c, OrderItem__r.DeliveryGroup__c
				FROM OrderItemWorkOrder__c
				WHERE WorkOrder__c = :workOrderId
			];

			if (links.isEmpty()) {
				return new List<DeliveryGroup__c>();
			}

			Set<Id> deliveryGroupIds = new Set<Id>();
			Set<Id> orderItemIds = new Set<Id>();
			for (OrderItemWorkOrder__c l : links) {
				if (l.OrderItem__r.DeliveryGroup__c != null) {
					deliveryGroupIds.add(l.OrderItem__r.DeliveryGroup__c);
				}

				if (l.OrderItem__c != null) {
					orderItemIds.add(l.OrderItem__c);
				}
			}

			if (deliveryGroupIds.isEmpty()) {
				return new List<DeliveryGroup__c>();
			}

			List<DeliveryGroup__c> groups = [
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
					DeliveryCenter__c,
					DeliveryCenter__r.Name,
					(
						SELECT Name,
							Description__c,
							TrackingNumber__c
						FROM PackingSlips__r
						ORDER BY Name
					),
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
							WorkOrderStatus__c,
							OrderId,
							PricebookEntryId,
							ParentOrderProduct__c,
							ParentOrderProduct__r.Product2.Name,
							Product2Id,
							Product2.Name,
							Product2.ProductCode,
							Product2.Finish__c,
							Product2.Material__c,
							Product2.Material__r.Name,
							Product2.RecordTypeId,
							Product2.RecordType.DeveloperName
						FROM OrderProducts__r
						WHERE Id IN :orderItemIds
						ORDER BY CreatedDate
					)
				FROM DeliveryGroup__c
				WHERE Id IN :deliveryGroupIds
				ORDER BY DueDate__c NULLS LAST, CreatedDate
			];
			return groups;
		} catch (Exception ex) {
			throw new AuraHandledException(ex.getMessage());
		}
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
				DeliveryCenter__c,
				(
					SELECT Name,
						Description__c,
						TrackingNumber__c
					FROM PackingSlips__r
					ORDER BY Name
				),
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
						ParentOrderProduct__c,
						PricebookEntryId,
						Product2Id
					FROM OrderProducts__r
					ORDER BY CreatedDate
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
					DeliveryCenter__c,
					(
						SELECT Name,
							Description__c,
							TrackingNumber__c
						FROM PackingSlips__r
						ORDER BY Name
					),
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
							ParentOrderProduct__c,
							PricebookEntryId,
							Product2Id,
							Quantity,
							TotalPrice,
							UnitPrice,
							UnitType__c
						FROM OrderProducts__r
						ORDER BY CreatedDate
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