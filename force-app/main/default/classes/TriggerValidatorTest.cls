/**
 * @description       : 
 * @author            : dmorales
 * @group             : 
 * @last modified on  : 09-09-2021
 * @last modified by  : dmorales
**/
@isTest
private class TriggerValidatorTest {
    @isTest
    static void testTriggerValidator() {
        TriggerValidator validator = new TriggerValidator();
        Boolean validateRunDefault = validator.validateRun();
        System.assertEquals(validateRunDefault, true, 
            'TriggerValidator Run method return wrong default');
    }
}
