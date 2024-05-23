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
	public String defaultNextId { get; private set; }
	
	@AuraEnabled
	public Boolean isMachineInfoRequired { get; private set; }
	
	@AuraEnabled
	public List<ProcedureFieldInfo> extraFields { get; private set; }

	private Procedure(Procedure__c record) {
		value = record.Id;
		label = record.Name;
		defaultNextId = record.DefaultNextProcedure__c;
		isMachineInfoRequired = record.IsMachineInfoRequired__c;

		try {
			/* extraFields = (List<ProcedureFieldInfo>)JSON.deserialize(
				record.ExtraFieldsJson__c, List<ProcedureFieldInfo>.class); */
		} catch (JSONException ex) {
			// we dn't want to block the program if it fails
			extraFields = new List<ProcedureFieldInfo>();
		}
			
	}

	/**
	 * Returns the first 2000 procedures in the DB.
	 * @return List<Procedure>
	 */
	@AuraEnabled(cacheable=true)
	public static List<Procedure> getAll() {
		List<Procedure> result;
		try {
			result = new List<Procedure>();
			for (Procedure__c p : [
					SELECT Name,
						DefaultNextProcedure__c,
						IsMachineInfoRequired__c/* ,
						ExtraFieldsJson__c */
					FROM Procedure__c
					ORDER BY Name
					LIMIT 2000
				])
				result.add(new Procedure(p));

			return result;
		} catch (Exception e) {
			throw new AuraHandledException(e.getMessage());
		}
	}
}