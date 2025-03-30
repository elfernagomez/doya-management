/**
 * @description       : 
 * @author            : dmorales
 * @group             : 
 * @last modified on  : 09-09-2021
 * @last modified by  : dmorales
**/
@isTest
private class TriggerDispatcherTest {

    private static final String TRIGGER_CONTEXT_ERROR = 'Trigger handler called outside of Trigger execution';

    private static String lastMethodCalled;
  
    private static TriggerDispatcher dispatcher;
    private static TriggerDispatcherTest.TestHandler handler;
    private static TriggerDispatcherTest.TestValidator validator;
  
    static {
        handler =  new TriggerDispatcherTest.TestHandler();
        validator =  new TriggerDispatcherTest.TestValidator();
        dispatcher = new TriggerDispatcher(handler, validator);       
    }
  
    /***************************************
     * unit tests
     ***************************************/
  
    // contexts tests
  
    @isTest
    static void testBeforeInsert() {
      beforeInsertMode();
      dispatcher.run();
      System.assertEquals('beforeInsert', lastMethodCalled, 'last method should be beforeInsert');
    }
  
    @isTest
    static void testBeforeUpdate() {
      beforeUpdateMode();
      dispatcher.run();
      System.assertEquals('beforeUpdate', lastMethodCalled, 'last method should be beforeUpdate');
    }
  
    @isTest
    static void testBeforeDelete() {
      beforeDeleteMode();
      dispatcher.run();
      System.assertEquals('beforeDelete', lastMethodCalled, 'last method should be beforeDelete');
    }
  
    @isTest
    static void testAfterInsert() {
      afterInsertMode();
      dispatcher.run();
      System.assertEquals('afterInsert', lastMethodCalled, 'last method should be afterInsert');
    }
  
    @isTest
    static void testAfterUpdate() {
      afterUpdateMode();
      dispatcher.run();
      System.assertEquals('afterUpdate', lastMethodCalled, 'last method should be afterUpdate');
    }
  
    @isTest
    static void testAfterDelete() {
      afterDeleteMode();
      dispatcher.run();
      System.assertEquals('afterDelete', lastMethodCalled, 'last method should be afterDelete');
    }
  
    @isTest
    static void testAfterUndelete() {
      afterUndeleteMode();
      dispatcher.run();
      System.assertEquals('afterUndelete', lastMethodCalled, 'last method should be afterUndelete');
    }
  

       
    /***************************************
     * testing utilities
     ***************************************/
  
    private static void resetTest() {
      lastMethodCalled = null;
    }
  
    // modes for testing
  
    private static void beforeInsertMode() {
        dispatcher.setTriggerContext('before insert', true);
    }
  
    private static void beforeUpdateMode() {
        dispatcher.setTriggerContext('before update', true);
    }
  
    private static void beforeDeleteMode() {
        dispatcher.setTriggerContext('before delete', true);
    }
  
    private static void afterInsertMode() {
        dispatcher.setTriggerContext('after insert', true);
    }
  
    private static void afterUpdateMode() {
        dispatcher.setTriggerContext('after update', true);
    }
  
    private static void afterDeleteMode() {
        dispatcher.setTriggerContext('after delete', true);
    }
  
    private static void afterUndeleteMode() {
        dispatcher.setTriggerContext('after undelete', true);
    }
  
    // test implementation of the TriggerHandler
  
    private class TestHandler extends TriggerHandler {
  
      public override void beforeInsert() {
        TriggerDispatcherTest.lastMethodCalled = 'beforeInsert';
      }
  
      public override void  beforeUpdate() {
        TriggerDispatcherTest.lastMethodCalled = 'beforeUpdate';
      }
  
      public override void beforeDelete() {
        TriggerDispatcherTest.lastMethodCalled = 'beforeDelete';
      }
  
      public override void afterInsert() {
        TriggerDispatcherTest.lastMethodCalled = 'afterInsert';
      }
  
      public override void afterUpdate() {
        TriggerDispatcherTest.lastMethodCalled = 'afterUpdate';
      }
  
      public override void afterDelete() {
        TriggerDispatcherTest.lastMethodCalled = 'afterDelete';
      }
  
      public override void afterUndelete() {
        TriggerDispatcherTest.lastMethodCalled = 'afterUndelete';
      }
  
    }

    private class TestValidator extends TriggerValidator {
  
      public override Boolean validateRun() {
         return true;         
      }
       
    }
}
