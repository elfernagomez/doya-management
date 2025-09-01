/**
 * @description
 * FieldSetManager is a utility Apex class that exposes the fields
 * of a field set from any sObject. It allows Lightning Web Components (LWCs)
 * to retrieve field API names in a specified field set.
 */
public with sharing class FieldSetManager {

	/**
	 * @description
	 * Returns the list of field API names defined in a field set
	 * for the given sObject.
	 *
	 * @param objectName   API name of the sObject (e.g., 'Account').
	 * @param fieldSetName Name of the field set defined on the sObject.
	 * @return             List of field API names in the field set.
	 *
	 * @throws AuraHandledException if the object or field set is invalid.
	 */
	@AuraEnabled(cacheable=true)
	public static Map<String, List<FieldInfo>> getFieldDetailsFromFieldSet(
		String objectName,
		List<String> fieldSetNames
	) {
		Map<String, List<FieldInfo>> result;
		try {
			result = new Map<String, List<FieldInfo>>();
			for (String fieldSetName : fieldSetNames) {
				result.put(
					fieldSetName,
					getFieldDetails(objectName, fieldSetName));
			}
			return result;
		} catch (Exception ex) {
			throw new AuraHandledException(ex.getMessage());
		}
	}

	public static List<String> getFieldNames(
		String objectName,
		String fieldSetName
	) {
		FieldSetManagerException ex;
		List<String> fieldNames = new List<String>();

		Schema.SObjectType targetType =
			Schema.getGlobalDescribe().get(objectName);

		if (targetType == null) {
			ex = new FieldSetManagerException('FieldSetManagerException');
			ex.setMessage('Invalid object: ' + objectName);
			throw ex;
		}

		Schema.DescribeSObjectResult describeResult =
			targetType.getDescribe();

		Schema.FieldSet fieldSet =
			describeResult.fieldSets.getMap().get(fieldSetName);

		if (fieldSet == null) {
			ex = new FieldSetManagerException('FieldSetManagerException');
			ex.setMessage('Invalid field set: ' + fieldSetName);
			throw ex;
		}

		for (Schema.FieldSetMember member : fieldSet.getFields()) {
			fieldNames.add(member.getFieldPath());
		}

		return fieldNames;
	}

	public static List<FieldInfo> getFieldDetails(
		String objectName,
		String fieldSetName
	) {
		FieldSetManagerException ex;
		List<FieldInfo> fieldInfos = new List<FieldInfo>();

		Schema.SObjectType targetType =
			Schema.getGlobalDescribe().get(objectName);

		if (targetType == null) {
			ex = new FieldSetManagerException('FieldSetManagerException');
			ex.setMessage('Invalid object: ' + objectName);
			throw ex;
		}

		Schema.DescribeSObjectResult describeResult =
			targetType.getDescribe();

		Schema.FieldSet fieldSet =
			describeResult.fieldSets.getMap().get(fieldSetName);

		if (fieldSet == null) {
			ex = new FieldSetManagerException('FieldSetManagerException');
			ex.setMessage('Invalid field set: ' + fieldSetName);
			throw ex;
		}

		for (Schema.FieldSetMember member : fieldSet.getFields()) {
			fieldInfos.add(new FieldInfo(member));
		}

		return fieldInfos;
	}

	/**
	 * Wrapper class representing details
	 * about a field in a field set.
	 */
	public class FieldInfo {
		@AuraEnabled
		public Boolean isNameField { get; set; }

		@AuraEnabled
		public String apiName { get; set; }

		@AuraEnabled
		public String label { get; set; }

		@AuraEnabled
		public String type { get; set; }

		@AuraEnabled
		public Boolean isLookup { get; set; }

		@AuraEnabled
		public Boolean isRequired { get; set; }

		@AuraEnabled
		public Boolean isNumeric { get; set; }

		@AuraEnabled
		public String relationshipName { get; set; }

		@AuraEnabled
		public String relatedToApiName { get; set; }

		@AuraEnabled
		public String relatedToNameFieldApiName { get; set; }

		public FieldInfo(Schema.FieldSetMember member) {
			Schema.DescribeFieldResult fieldDesc;
			List<Schema.SObjectType> referencedTypes;
			Schema.SObjectType refType;
			Schema.DescribeSObjectResult refDescribe;
			Schema.DescribeSObjectResult describeResult;

			fieldDesc = member.getSObjectField().getDescribe();
			isNameField = fieldDesc.isNameField();
			apiName = member.getFieldPath();
			label = member.getLabel();
			type = String.valueOf(member.getType());
			isLookup = member.getType() == Schema.DisplayType.REFERENCE;
			isRequired = member.getDBRequired();
			isNumeric = member.getType() == Schema.DisplayType.DOUBLE ||
				member.getType() == Schema.DisplayType.INTEGER ||
				member.getType() == Schema.DisplayType.LONG ||
				member.getType() == Schema.DisplayType.CURRENCY ||
				member.getType() == Schema.DisplayType.PERCENT;

			if (isLookup) {
				referencedTypes = fieldDesc.getReferenceTo();

				if (!referencedTypes.isEmpty()) {
					refType = referencedTypes[0];
					describeResult = refType.getDescribe();
					relationshipName = fieldDesc.getRelationshipName();
					relatedToApiName = describeResult.getName();
					relatedToNameFieldApiName = getNameField(describeResult);
				}
			}
		}

		private String getNameField(Schema.DescribeSObjectResult describeResult) {
			Map<String, Schema.SObjectField> fields = describeResult.fields.getMap();
			for (String fieldName : fields.keySet()) {
				Schema.DescribeFieldResult fDesc = fields.get(fieldName).getDescribe();
				System.debug(fDesc.getName());
				if (fDesc.isNameField()) {
					return fDesc.getName();
				}
			}
			
			return null;
		}
	}

	public class FieldSetManagerException extends Exception {}
}
