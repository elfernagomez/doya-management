/**
 * Wraps infromation about a field to show for a specified procedure.
 * @author Fernando Gomez
 * @version 1.0
 * @since 5/5/2024
 */
public inherited sharing class ProcedureFieldInfo {
	@AuraEnabled
	public Integer order { get; set; }
	
	@AuraEnabled
	public String fieldLabel { get; set; }
	
	@AuraEnabled
	public String fieldApiName { get; set; }
	
	@AuraEnabled
	public String fieldTitle { get; set; }
	
	@AuraEnabled
	public Boolean isRequired { get; set; }

	/*
	{
		"order":1,
		"fieldLabel":"Duration",
		"fieldApiName":"Duration",
		"fieldTitle":"Duration (Duration)",
		"isRequired":true,
		"isLabelDisabled":false,
		"isRequiredDisabled":false
	}
	*/
}