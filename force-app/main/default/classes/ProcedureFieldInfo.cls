/**
 * Wraps infromation about a field to show for a specified procedure.
 * @author Fernando Gomez
 * @version 1.0
 * @since 5/5/2024
 */
public inherited sharing class ProcedureFieldInfo {
	@AuraEnabled
	public String fiedApiName { get; set; }
	
	@AuraEnabled
	public Boolean isRequired { get; set; }
}