/**
 * @description An opinionated trigger handler framework.
 * Originally by Kevin O'Hara github.com/kevinohara80/sfdc-trigger-framework
 * @group Shared Code
 * @see AccountTriggerHandler, PlatformEventRecipesTriggerHandler
 */
public virtual class TriggerHandler {

	public List<sObject> triggerNew;
	public List<sObject> triggerOld;
	public Map<Id, sObject> triggerMapNew;
	public Map<Id, sObject> triggerMapOld;


	public TriggerHandler() {
		this.triggerOld = Trigger.old;
		this.triggerNew = Trigger.new;
		this.triggerMapNew = Trigger.newMap;
		this.triggerMapOld =  Trigger.oldMap;
	}
	
	/**
	 * @description Virtual method for the implementing class to override
	 */
	@testVisible
	@SuppressWarnings('PMD.EmptyStatementBlock')
	public virtual void beforeInsert() {
	}
	/**
	 * @description Virtual method for the implementing class to override
	 */
	@testVisible
	@SuppressWarnings('PMD.EmptyStatementBlock')
	public virtual void beforeUpdate() {
	}
	/**
	 * @description Virtual method for the implementing class to override
	 */
	@testVisible
	@SuppressWarnings('PMD.EmptyStatementBlock')
	public virtual void beforeDelete() {
	}
	/**
	 * @description Virtual method for the implementing class to override
	 */
	@testVisible
	@SuppressWarnings('PMD.EmptyStatementBlock')
	public virtual void afterInsert() {
	}
	/**
	 * @description Virtual method for the implementing class to override
	 */
	@testVisible
	@SuppressWarnings('PMD.EmptyStatementBlock')
	public virtual void afterUpdate() {
	}
	/**
	 * @description Virtual method for the implementing class to override
	 */
	@testVisible
	@SuppressWarnings('PMD.EmptyStatementBlock')
	public virtual void afterDelete() {
	}
	/**
	 * @description Virtual method for the implementing class to override
	 */
	@testVisible
	@SuppressWarnings('PMD.EmptyStatementBlock')
	public virtual void afterUndelete() {
	}

	/**
	 * @return the ids of the new records
	 */
	protected List<Id> getNewIds() {
		return triggerMapNew != null ? new List<Id>(triggerMapNew.keySet()) : null;
	}

	/**
	 * @return the ids of the old records
	 */
	protected List<Id> getOldIds() {
		return triggerMapOld != null ? new List<Id>(triggerMapOld.keySet()) : null;
	}
}
