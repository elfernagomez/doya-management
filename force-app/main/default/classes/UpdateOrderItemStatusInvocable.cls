/**
 * @description Invocable class to update OrderItem Work Order Status from Flow
 * Triggered when WorkOrder status changes
 */
public with sharing class UpdateOrderItemStatusInvocable {
    
    /**
     * @description Invocable method to update OrderItem status based on WorkOrder changes
     * @param requests List of input parameters containing WorkOrder IDs
     */
    @InvocableMethod(
        label='Update Order Item Status from Work Orders'
        description='Propagates WorkOrder status changes to related OrderItems via junction object'
        category='Order Management'
    )
    public static void updateOrderItemStatus(List<Request> requests) {
        if (requests == null || requests.isEmpty()) {
            return;
        }
        
        Set<Id> workOrderIds = new Set<Id>();
        
        // Collect all WorkOrder IDs from requests
        for (Request req : requests) {
            if (req.workOrderId != null) {
                workOrderIds.add(req.workOrderId);
            }
        }
        
        // Call the utility class to perform the status update
        if (!workOrderIds.isEmpty()) {
            StatusPropagationUtil.updateOrderItemStatusFromWorkOrders(workOrderIds);
        }
    }
    
    /**
     * @description Input parameter wrapper class for invocable method
     */
    public class Request {
        @InvocableVariable(
            label='Work Order ID'
            description='ID of the WorkOrder record that triggered the flow'
            required=true
        )
        public Id workOrderId;
    }
}
