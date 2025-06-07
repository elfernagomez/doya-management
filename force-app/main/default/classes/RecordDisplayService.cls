public with sharing class RecordDisplayService {

	@AuraEnabled(cacheable=true)
	public static Map<String, String> getRecordDisplayData(Id recordId) {
		String prefix = String.valueOf(recordId).substring(0, 3);
		Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();

		Schema.SObjectType objType = recordId.getSobjectType();
		Schema.DescribeSObjectResult describe = objType.getDescribe();
		String nameField = getNameField(describe);
		String objectName = describe.getName();

		SObject record = Database.query(
			' SELECT ' + nameField +
			' FROM ' + objectName +
			' WHERE Id = :recordId LIMIT 1 '
		);

		return new Map<String, String> {
			'objectApiName' => objectName,
			'displayValue' => (String)record.get(nameField)
		};
	}

	/**
	 * Returns the API name of the name field for a given object.
	 *
	 * @param sObjectType The SObjectType to inspect.
	 * @return The API name of the field that is used as the name field.
	 */
	public static String getNameField(Schema.DescribeSObjectResult describe) {
		Map<String, Schema.SObjectField> fields = describe.fields.getMap();
		for (String fieldName : fields.keySet()) {
			Schema.DescribeFieldResult fieldDescribe = fields.get(fieldName).getDescribe();
			if (fieldDescribe.isNameField()) {
				return fieldName;
			}
		}
		return null; // If no name field is found
	}
}
