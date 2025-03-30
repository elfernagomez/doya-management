/**
 * @description       : 
 * @author            : dmorales
 * @group             : 
 * @last modified on  : 09-09-2021
 * @last modified by  : dmorales
**/
@isTest
private class TriggerHandlerTest {
    @isTest
    static void testTriggerHandler() {
        TriggerHandler h = new TriggerHandler();

        /* Testing static method  */
        h.beforeInsert();
        h.beforeUpdate();
        h.beforeDelete();
        h.afterInsert();
        h.afterUpdate();
        h.afterDelete();
        h.afterUndelete();

        System.assertEquals(h.triggerNew, null, 'Testing without an isolated environment');
        System.assertEquals(h.triggerOld, null, 'Testing without an isolated environment');
        System.assertEquals(h.triggerMapNew, null, 'Testing without an isolated environment');
        System.assertEquals(h.triggerMapOld, null, 'Testing without an isolated environment');
    }
}
