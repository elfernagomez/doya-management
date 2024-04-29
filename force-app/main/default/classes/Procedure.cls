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
	public String detailsType { get; private set; }
	
	@AuraEnabled
	public String detailsFieldApiName { get; private set; }
	
	@AuraEnabled
	public String defaultNextId { get; private set; }

	private Procedure(Procedure__c record) {
		value = record.Id;
		label = record.Name;
		detailsType = record.Details_Type__c;
		detailsFieldApiName = record.Details_Field_API_Name__c;
		defaultNextId = record.DefaultNextProcedure__c;
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
						Details_Type__c,
						Details_Field_API_Name__c,
						DefaultNextProcedure__c
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