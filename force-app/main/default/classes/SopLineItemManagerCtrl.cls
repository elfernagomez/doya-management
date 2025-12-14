/**
 * Controls: SopLineItemManagerCtrl (LWC)
 * @author Fernando Gomez
 * @version 1.0
 * @since 4/9/2025
 */
public with sharing class SopLineItemManagerCtrl {

	/**
	 * @param sopId
	 * @param fields list of field API names to query
	 * @return the list of SOP line items for the given SOP
	 */
	@AuraEnabled(cacheable=true)
	public static List<SopLineItem__c> getSopLineItems(
		Id sopId,
		List<String> fields
	) {
		try {
			// Validate object access
			if (!Schema.SObjectType.SopLineItem__c.isAccessible()) {
				throw new AuraHandledException('Insufficient permissions to access SOP Line Items');
			}

			if (fields != null && !fields.isEmpty()) {
				// Escape field names for managed package compatibility
				List<String> escapedFields = new List<String>();
				for (String field : fields) {
					escapedFields.add(String.escapeSingleQuotes(field));
				}

				String query =
					' SELECT ' + String.join(escapedFields, ', ') + 
					' FROM SopLineItem__c ' +
					' WHERE SOP__c = :sopId ' +
					' ORDER BY Order__c ASC NULLS LAST, CreatedDate ASC ' +
					' LIMIT 500 ';
				
				System.debug('Query: ' + query);
				return Database.query(query);
			} else {
				return [
					SELECT SOP__c,
						Name,
						Title__c,
						Order__c,
						Procedure__c,
						Machine__c
					FROM SopLineItem__c
					WHERE SOP__c = :sopId
					ORDER BY Order__c ASC NULLS LAST, CreatedDate ASC
					LIMIT 500
				];
			}
		} catch (Exception ex) {
			System.debug(ex.getMessage() + '\n' + ex.getStackTraceString());
			throw new AuraHandledException(ex.getMessage());
		}
	}
}