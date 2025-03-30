/**
 * @File Name          : BaseTriggerValidationManager.cls
 * @Description        : This class use a bypass mechanism as a basic implementation
 *                       for validate whether the trigger should be run or not.
 * @Author             : dmorales
 * @Group              : 
 * @Last Modified By   : acantero
 * @Last Modified On   : 3/11/2022, 6:23:27 PM
 * @Modification Log   : 
 *==============================================================================
 * Ver         Date                     Author      		      Modification
 *==============================================================================
 * 1.0    3/11/2022, 4:55:35 PM   acantero     Initial Version
**/
public without sharing abstract class BaseTriggerValidationManager extends TriggerValidator {

    static Set<String> bypassedHandlers = new Set<String>();  

    protected String handlerName;
    
    public BaseTriggerValidationManager(String handlerName) {
        this.handlerName = handlerName;
    }

    /**
     * @description  Allows developers to conditionally bypass (disable)
     * other triggers
     * @param handlerName Class name (String) of the trigger handler to bypass
     * @example
     * TriggerValidationManager.bypass('AccountTriggerHandler');
     */
    public static void bypass(String handlerName) {
        bypassedHandlers.add(handlerName);
    }

    /**
     * @description Removes a given trigger handler class name from
     * the list of bypassed trigger handlers.
     * @param handlerName Handler class name to remove from the bypass list
     * @example
     * TriggerValidationManager.clearBypass('AccountTriggerHandler');
     */
    public static void clearBypass(String handlerName) {
        bypassedHandlers.remove(handlerName);
    }

    /**
     * @description  Allows developers to check whether a given trigger
     * handler class is currently bypassed.
     * @param handlerName The name of the trigger handler class to check for
     * @return           `Boolean`
     * @example
     * TriggerValidationManager.isBypassed('AccountTriggerHandler');
     */
    public static Boolean isBypassed(String handlerName) {
        return bypassedHandlers.contains(handlerName);
    }

    /**
     * @description removes all classes from the bypass list
     * @example
     * TriggerValidationManager.clearAllBypasses();
     */
    public static void clearAllBypasses() {
        bypassedHandlers.clear();
    }

    public static Boolean areThereBypasses() {
        return (!bypassedHandlers.isEmpty());
    }

}

