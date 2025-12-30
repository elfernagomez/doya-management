/**
 * @description Utility class to propagate WorkOrder status to related OrderItem records
 * via the OrderItemWorkOrder__c junction object
 */
public with sharing class StatusPropagationUtil {
    
    private static final String STATUS_PENDING = 'Pending';
    private static final String STATUS_IN_PROGRESS = 'In Progress';
    private static final String STATUS_COMPLETED = 'Completed';
    
    /**
     * @description Updates OrderItem Work Order Status based on related WorkOrder statuses
     * @param workOrderIds Set of WorkOrder IDs to process
     */
    public static void updateOrderItemStatusFromWorkOrders(Set<Id> workOrderIds) {
        if (workOrderIds == null || workOrderIds.isEmpty()) {
            return;
        }
        
        // Query junction records to get OrderItem to WorkOrder relationships
        List<OrderItemWorkOrder__c> junctions = [
            SELECT Id, OrderItem__c, WorkOrder__c, WorkOrder__r.Status
            FROM OrderItemWorkOrder__c
            WHERE WorkOrder__c IN :workOrderIds
			AND OrderItem__c != null
        ];
        
        // Group junction records by OrderItem
        Map<Id, List<OrderItemWorkOrder__c>> orderItemToJunctions = new Map<Id, List<OrderItemWorkOrder__c>>();
        Set<Id> affectedOrderItemIds = new Set<Id>();
        
        for (OrderItemWorkOrder__c junction : junctions) {
            affectedOrderItemIds.add(junction.OrderItem__c);
            if (!orderItemToJunctions.containsKey(junction.OrderItem__c)) {
                orderItemToJunctions.put(junction.OrderItem__c, new List<OrderItemWorkOrder__c>());
            }
            orderItemToJunctions.get(junction.OrderItem__c).add(junction);
        }
        
        // Query all junction records for affected OrderItems to get complete picture
        List<OrderItemWorkOrder__c> allJunctionsForOrderItems = [
            SELECT Id, OrderItem__c, WorkOrder__c, WorkOrder__r.Status
            FROM OrderItemWorkOrder__c
            WHERE OrderItem__c IN :affectedOrderItemIds
        ];
        
        // Rebuild the map with all junctions
        orderItemToJunctions.clear();
        for (OrderItemWorkOrder__c junction : allJunctionsForOrderItems) {
            if (!orderItemToJunctions.containsKey(junction.OrderItem__c)) {
                orderItemToJunctions.put(junction.OrderItem__c, new List<OrderItemWorkOrder__c>());
            }
            orderItemToJunctions.get(junction.OrderItem__c).add(junction);
        }
        
        // Calculate status for each OrderItem
        List<OrderItem> orderItemsToUpdate = new List<OrderItem>();
        
        for (Id orderItemId : affectedOrderItemIds) {
            String calculatedStatus = calculateOrderItemStatus(orderItemToJunctions.get(orderItemId));
            orderItemsToUpdate.add(new OrderItem(
                Id = orderItemId,
                WorkOrderStatus__c = calculatedStatus
            ));
        }
        
        // Update OrderItems
        if (!orderItemsToUpdate.isEmpty()) {
            update orderItemsToUpdate;
        }
    }
    
    /**
     * @description Calculates the status for an OrderItem based on its related WorkOrders
     * @param junctions List of junction records for a single OrderItem
     * @return String The calculated status
     */
    private static String calculateOrderItemStatus(List<OrderItemWorkOrder__c> junctions) {
        // If no work orders, status is Pending
        if (junctions == null || junctions.isEmpty()) {
            return STATUS_PENDING;
        }
        
        Boolean hasNonCompleted = false;
        Boolean hasCompleted = false;
        
        for (OrderItemWorkOrder__c junction : junctions) {
            String workOrderStatus = junction.WorkOrder__r.Status;
            
            if (workOrderStatus == STATUS_COMPLETED) {
                hasCompleted = true;
            } else {
                hasNonCompleted = true;
            }
        }
        
        // If all work orders are completed
        if (hasCompleted && !hasNonCompleted) {
            return STATUS_COMPLETED;
        }
        
        // Otherwise, status is In Progress
        return STATUS_IN_PROGRESS;
    }
    
    /**
     * @description Overload to accept List of WorkOrder IDs
     * @param workOrderIds List of WorkOrder IDs to process
     */
    public static void updateOrderItemStatusFromWorkOrders(List<Id> workOrderIds) {
        if (workOrderIds != null) {
            updateOrderItemStatusFromWorkOrders(new Set<Id>(workOrderIds));
        }
    }
}
