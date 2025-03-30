/**
 * @description       : This class is provided as example. This class use a bypass mechanism 
                        as a basic implementation for validate whether the trigger 
                        should be run or not.                           
 * @author            : dmorales
 * @group             : 
 * @last modified on  : 09-09-2021
 * @last modified by  : dmorales
**/
public with sharing class TriggerValidationManager extends BaseTriggerValidationManager {

    public TriggerValidationManager(String handlerName) {
        super(handlerName);
    }
     
    public override Boolean validateRun() {
        return (isBypassed(handlerName) == false);
    }
    
}