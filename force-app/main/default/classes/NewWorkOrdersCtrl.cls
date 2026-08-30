/**
 * 
 */
public with sharing class NewWorkOrdersCtrl {

	@AuraEnabled(cacheable=true)
	public static Map<Id, List<WorkOrder>> getExistingWorkOrders(
		Id orderId
	) {
		Set<Id> workOrderIds;
		Map<Id, List<WorkOrder>> result;
		try {
			workOrderIds = new Set<Id>();
			result = new Map<Id, List<WorkOrder>>();

			for (AggregateResult ar : [
				SELECT WorkOrder__c woId
				FROM OrderItemWorkOrder__c
				WHERE OrderItem__r.OrderId = :orderId
				GROUP BY WorkOrder__c
			]) {
				workOrderIds.add((Id)ar.get('woId'));
			}

			for (OrderItemWorkOrder__c oiw : [
				SELECT Id,
					OrderItem__c,
					WorkOrder__c,
					WorkOrder__r.Id,
					WorkOrder__r.Title__c
				FROM OrderItemWorkOrder__c
				WHERE WorkOrder__c IN :workOrderIds
				ORDER BY CreatedDate DESC
				LIMIT 200
			]) {
				if (!result.containsKey(oiw.OrderItem__c)) {
					result.put(oiw.OrderItem__c, new List<WorkOrder>());
				}
				result.get(oiw.OrderItem__c).add(oiw.WorkOrder__r);
			}
			return result;
		} catch (Exception ex) {
			throw new AuraHandledException(
				ex.getMessage() + 
				', ' + ex.getStackTraceString());
		}
	}

	/**
	 * @param productId
	 * @param unitType
	 * @param width
	 * @param height
	 * @param depth
	 * @param searchTerm
	 * @return List<WorkOrder>
	 */
	@AuraEnabled
	public static List<WorkOrder> getWorkOrdersForOrder(
		Id productId,
		String unitType,
		Decimal width,
		Decimal height,
		Decimal depth,
		String searchTerm
	) {
		try {
			if (String.isNotBlank(searchTerm)) {
				String likeCriteria = '%' + searchTerm + '%';
				return [
					SELECT Id,
						Width__c,
						Height__c,
						Depth__c,
						UnitType__c,
						Title__c,
						WorkOrderNumber
					FROM WorkOrder
					WHERE Status = 'New'
					AND Title__c LIKE :likeCriteria
					AND Product__c = :productId
					AND UnitType__c = :unitType
					AND Width__c = :width
					AND Height__c = :height
					AND Depth__c = :depth
					ORDER BY CreatedDate DESC
					LIMIT 200
				];
			}
			
			return [
				SELECT Id,
					Width__c,
					Height__c,
					Depth__c,
					UnitType__c,
					Title__c,
					WorkOrderNumber
				FROM WorkOrder
				WHERE Status = 'New'
				AND Product__c = :productId
				AND UnitType__c = :unitType
				AND Width__c = :width
				AND Height__c = :height
				AND Depth__c = :depth
				ORDER BY CreatedDate DESC
				LIMIT 200
			];
		} catch (Exception ex) {
			throw new AuraHandledException(
				ex.getMessage() + 
				', ' + ex.getStackTraceString());
		}
	}

	/**
	 * @param workOrdersToInsert
	 */
	@AuraEnabled
	public static List<OrderProductDTO> createWorkOrdersFromOrderItems(
		List<OrderProductDTO> orderItems
	) {
		List<WorkOrder> workOrdersToInsert;
		List<OrderProductDTO> itemsWithNewWorkOrders = new List<OrderProductDTO>();
		List<OrderItemWorkOrder__c> orderItemWorkOrdersToInsert;
		Map<Id, Id> itemToWorkOrderMap = new Map<Id, Id>();
		Map<Id, WorkOrder> existingWorkOrderMap = new Map<Id, WorkOrder>();
		Id workOrderId;

		try {
			workOrdersToInsert = new List<WorkOrder>();
			orderItemWorkOrdersToInsert = new List<OrderItemWorkOrder__c>();

			// first create work orders for each order item
			for (OrderProductDTO item : orderItems) {
				switch on item.workOrderAction {
					when 'new' {
						itemsWithNewWorkOrders.add(item);	
						workOrdersToInsert.add(new WorkOrder(
							Order__c = item.orderId,
							Product__c = item.productId,
							SOP__c = item.sopId,
							DueDate__c = item.dueDate,
							Material__c = item.materialId,
							Width__c = item.width,
							Height__c = item.height,
							Depth__c = item.depth,
							Quantity__c = item.qty,
							UnitType__c = item.unitType,
							Status = 'New'
						));
					}
					when 'add' {
						itemToWorkOrderMap.put(
							item.uniqueId,
							item.workOrderId);
					}
					when else {
						// unknown action, so do nothing
					}
				}
			}

			// insert the work orders
			insert workOrdersToInsert;

			// the work orders to be added to, we
			// need to add to the quantity
			existingWorkOrderMap = new Map<Id, WorkOrder>([
				SELECT Id, Quantity__c
				FROM WorkOrder
				WHERE Id IN :itemToWorkOrderMap.values()
			]);

			// let's put the new ids in the itemToWorkOrderMap
			for (Integer i = 0; i < workOrdersToInsert.size(); i++) {
				itemToWorkOrderMap.put(
					itemsWithNewWorkOrders[i].uniqueId,
					workOrdersToInsert[i].Id);
			}

			// then we need to add the relationsship to the order products
			for (OrderProductDTO item : orderItems) {
				workOrderId = itemToWorkOrderMap.get(item.uniqueId);
				item.workOrderId = workOrderId;
				for (OrderProductDTO itemPart : item.items) {
					orderItemWorkOrdersToInsert.add(new OrderItemWorkOrder__c(
						OrderItem__c = itemPart.uniqueId,
						WorkOrder__c = workOrderId
					));
				}

				// we increase the quantity
				if (existingWorkOrderMap.containsKey(workOrderId)) {
					existingWorkOrderMap.get(workOrderId).Quantity__c += item.qty;
				}
			}

			// insert the order item work orders
			update existingWorkOrderMap.values();
			insert orderItemWorkOrdersToInsert;
			return orderItems;
		} catch (Exception ex) {
			throw new AuraHandledException(
				ex.getMessage() + 
				', ' + ex.getStackTraceString());
		}
	}

	@AuraEnabled(cacheable=true)
	public static Map<Id, SOP__c> getDefaultSopPerProduct(List<Id> productIds) {
		try {
			Map<Id, SOP__c> result = new Map<Id, SOP__c>();
			if (productIds == null || productIds.isEmpty()) {
				return result;
			}

			for (SopProduct__c sp : [
				SELECT Id,
					Product__c,
					SOP__c,
					SOP__r.Name,
					IsDefault__c,
					IsSopActive__c,
					CreatedDate
				FROM SopProduct__c
				WHERE Product__c IN :productIds
				AND IsDefault__c = true
				AND IsSopActive__c = true
				AND SOP__c != null
				ORDER BY CreatedDate ASC
			]) {
				if (!result.containsKey(sp.Product__c)) {
					result.put(
						sp.Product__c,
						new SOP__c(
							Id = sp.SOP__c,
							Name = sp.SOP__r?.Name
						)
					);
				}
			}
			return result;
		} catch (Exception ex) {
			throw new AuraHandledException(
				ex.getMessage() + ', ' + ex.getStackTraceString()
			);
		}
	}

	public class OrderProductDTO {
		@AuraEnabled
		public String uniqueId { get; set; }

		@AuraEnabled
		public String sopId { get; set; }

		@AuraEnabled
		public Date dueDate { get; set; }

		@AuraEnabled
		public String orderId { get; set; }

		@AuraEnabled
		public String productId { get; set; }

		@AuraEnabled
		public String materialId { get; set; }

		@AuraEnabled
		public String unitType { get; set; }

		@AuraEnabled
		public Decimal qty { get; set; }

		@AuraEnabled
		public Decimal depth { get; set; }

		@AuraEnabled
		public Decimal width { get; set; }

		@AuraEnabled
		public Decimal height { get; set; }

		@AuraEnabled
		public Boolean isPart { get; set; }

		@AuraEnabled
		public Boolean hasParts { get; set; }

		@AuraEnabled
		public String workOrderId { get; set; }

		@AuraEnabled
		public String workOrderAction { get; set; }

		@AuraEnabled
		public List<OrderProductDTO> items { get; set; }
	}
}