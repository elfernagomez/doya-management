/**
 * Wraps infromation about a procedure record.
 * @author Fernando Gomez
 * @version 1.0
 * @sicne 4/28/2024
 */
public with sharing class Procedure {
	@AuraEnabled
	public String value { get; private set; }

	@AuraEnabled
	public String label { get; private set; }

	@AuraEnabled
	public String colorCode { get; private set; }
	
	@AuraEnabled
	public String defaultNextId { get; private set; }
	
	@AuraEnabled
	public Boolean isMachineInfoRequired { get; private set; }

	@AuraEnabled
	public List<String> machineSkills { get; private set; }
	
	@AuraEnabled
	public List<ProcedureFieldInfo> adminFields { get; private set; }

	@AuraEnabled
	public List<ProcedureFieldInfo> productionFields { get; private set; }

	private Procedure(Procedure__c record) {
		value = record.Id;
		label = record.Name;
		colorCode = record.ColorCssCode__c ?? '#ffffff';
		defaultNextId = record.DefaultNextProcedure__c;
		isMachineInfoRequired = record.IsMachineInfoRequired__c;
		machineSkills =
			String.isNotBlank(record.MachineSkills__c) ?
			record.MachineSkills__c.split(';') :
			new List<String>();

		try {
			adminFields = (List<ProcedureFieldInfo>)JSON.deserialize(
				record.AdminFieldsJson__c ?? '[]', List<ProcedureFieldInfo>.class);
		} catch (Exception ex) {
			// we dn't want to block the program if it fails
			adminFields = new List<ProcedureFieldInfo>();
		}

		try {
			productionFields = (List<ProcedureFieldInfo>)JSON.deserialize(
				record.ProductionFieldsJson__c ?? '[]',
				List<ProcedureFieldInfo>.class);
		} catch (Exception ex) {
			// we dn't want to block the program if it fails
			productionFields = new List<ProcedureFieldInfo>();
		}
			
	}

	/**
	 * Returns the first 2000 procedures in the DB.
	 * @return List<Procedure>
	 */
	@AuraEnabled(cacheable=true)
	public static List<Id> getAll() {
		List<Id> result;
		try {
			result = new List<Id>();
			for (Procedure__c p : [
					SELECT Id
					FROM Procedure__c
					ORDER BY Name
					LIMIT 2000
				])
				result.add(p.Id);

			return result;
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}
}