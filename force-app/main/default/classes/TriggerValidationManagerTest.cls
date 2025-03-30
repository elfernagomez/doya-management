/**
 * @description       : 
 * @author            : dmorales
 * @group             : 
 * @last modified on  : 09-09-2021
 * @last modified by  : dmorales
**/
@isTest
private class TriggerValidationManagerTest {
    @isTest
    static void testValidationManagerRun() {
        TriggerValidationManager validManager =
             new TriggerValidationManager('TestHandler');
        Boolean valid = validManager.validateRun();     
        System.assertEquals(valid, true, 'Wrong Validation Result');
    }
    @isTest
    static void testValidationManagerNoRun() {
        TriggerValidationManager validManager =
             new TriggerValidationManager('TestHandler');
        TriggerValidationManager.bypass('TestHandler');   
        Boolean valid = validManager.validateRun();     
        System.assertEquals(valid, false, 'Wrong Validation Result');
    }

    @isTest
    static void testBypass() {
     
        TriggerValidationManager.bypass('TestHandler');   
        Boolean isBypassed = TriggerValidationManager.isBypassed('TestHandler');    
        System.assertEquals(isBypassed, true, 'Wrong Bypass Result');

        //clear
        TriggerValidationManager.clearBypass('TestHandler'); 
        isBypassed = TriggerValidationManager.isBypassed('TestHandler');    
        System.assertEquals(isBypassed, false, 'Wrong Bypass Result');
      
    }

    @isTest
    static void testBypassClean() {
        
        TriggerValidationManager.bypass('TestHandler');   
        TriggerValidationManager.bypass('TestHandler2');   
     
        //clear All
        TriggerValidationManager.clearAllBypasses(); 
        System.assertEquals(false, TriggerValidationManager.areThereBypasses(), 'Wrong Clear Bypass Result');
    }
}