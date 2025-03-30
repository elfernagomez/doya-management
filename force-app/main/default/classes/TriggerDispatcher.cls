/**
 * @description       : 
 * @author            : dmorales
 * @group             : 
 * @last modified on  : 09-09-2021
 * @last modified by  : dmorales
**/
public with sharing class TriggerDispatcher {

	private TriggerHandler handler;
	private TriggerValidator validator;

	// private String objectName;
	@TestVisible
	private TriggerContext context;

	// the current context of the trigger, overridable in tests
	@TestVisible
	private Boolean isTriggerExecuting;

	/* Constructor */
	public TriggerDispatcher(TriggerHandler handler, TriggerValidator validator) {
			this.setTriggerContext();
			this.handler = handler;
			this.validator = validator;
	}
		
	/**
		* @description This is main brokering method that is called by the trigger.
		* It's responsible for determining the proper context, and calling the
		* correct method, and also validate if the trigger could be excecuted
		* @example
		* TriggerDispatcher.run();
		*/
	public void run() {
		if (!this.validator.validateRun()) {
			return;
		}

		switch on this.context {
			when BEFORE_INSERT {
				this.handler.beforeInsert();
			}
			when BEFORE_UPDATE {
				this.handler.beforeUpdate();
			}
			when BEFORE_DELETE {
				this.handler.beforeDelete();
			}
			when AFTER_INSERT {
				this.handler.afterInsert();
			}
			when AFTER_UPDATE {
				this.handler.afterUpdate();
			}
			when AFTER_DELETE {
				this.handler.afterDelete();
			}
			when AFTER_UNDELETE {
				this.handler.afterUndelete();
			}
		}
		
	}


	@TestVisible
	private void setTriggerContext() {
		this.setTriggerContext(null, false);
	}

	@TestVisible
	private void setTriggerContext(String ctx, Boolean testMode) {
		if(!Trigger.isExecuting && !testMode) {
			this.isTriggerExecuting = false;
			return;
		} else {
			this.isTriggerExecuting = true;
		}
		
		if((Trigger.isExecuting && Trigger.isBefore && Trigger.isInsert) ||
				(ctx != null && ctx == 'before insert')) {
			this.context = TriggerContext.BEFORE_INSERT;
		} else if((Trigger.isExecuting && Trigger.isBefore && Trigger.isUpdate) ||
				(ctx != null && ctx == 'before update')){
			this.context = TriggerContext.BEFORE_UPDATE;
		} else if((Trigger.isExecuting && Trigger.isBefore && Trigger.isDelete) ||
				(ctx != null && ctx == 'before delete')) {
			this.context = TriggerContext.BEFORE_DELETE;
		} else if((Trigger.isExecuting && Trigger.isAfter && Trigger.isInsert) ||
				(ctx != null && ctx == 'after insert')) {
			this.context = TriggerContext.AFTER_INSERT;
		} else if((Trigger.isExecuting && Trigger.isAfter && Trigger.isUpdate) ||
				(ctx != null && ctx == 'after update')) {
			this.context = TriggerContext.AFTER_UPDATE;
		} else if((Trigger.isExecuting && Trigger.isAfter && Trigger.isDelete) ||
				(ctx != null && ctx == 'after delete')) {
			this.context = TriggerContext.AFTER_DELETE;
		} else if((Trigger.isExecuting && Trigger.isAfter && Trigger.isUndelete) ||
				(ctx != null && ctx == 'after undelete')) {
			this.context = TriggerContext.AFTER_UNDELETE;
		}
	} 



	@TestVisible
	private enum TriggerContext {
		BEFORE_INSERT, BEFORE_UPDATE, BEFORE_DELETE,
		AFTER_INSERT, AFTER_UPDATE, AFTER_DELETE,
		AFTER_UNDELETE
	}

}
