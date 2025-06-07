@isTest
private class FieldSetManagerTest {

	@isTest
	static void testgetFieldDetails_validInput() {
		String objectName = 'WorkOrder';
		String fieldSetName = 'WorkOrderListViewFields';

		Test.startTest();
		List<FieldSetManager.FieldInfo> fields = FieldSetManager.getFieldDetails(
			objectName,
			fieldSetName
		);
		Test.stopTest();

		System.assertNotEquals(
			null,
			fields,
			'Field set fields should not be null'
		);
		System.assert(
			fields.size() > 0,
			'Field set should return at least one field'
		);
	}

	@isTest
	static void testgetFieldDetails_invalidObject() {
		try {
			FieldSetManager.getFieldDetails(
				'InvalidObject__c',
				'SomeFieldSet'
			);
			System.assert(false, 'Expected exception for invalid object');
		} catch (Exception e) {
			System.assert(
				e.getMessage().contains('Invalid object'),
				'Unexpected exception message: ' +
					e.getMessage() + '\n' + 
					e.getStackTraceString()
			);
		}
	}

	@isTest
	static void testgetFieldDetails_invalidFieldSet() {
		try {
			FieldSetManager.getFieldDetails(
				'Account',
				'NonExistentFieldSet'
			);
			System.assert(false, 'Expected exception for invalid field set');
		} catch (Exception e) {
			System.assert(
				e.getMessage().contains('Invalid field set'),
				'Unexpected exception message: ' +
					e.getMessage() + '\n' + 
					e.getStackTraceString()
			);
		}
	}

	@isTest
	static void testgetFieldNames_validInput() {
		String objectName = 'WorkOrder';
		String fieldSetName = 'WorkOrderListViewFields';

		Test.startTest();
		List<String> fields = FieldSetManager.getFieldNames(
			objectName,
			fieldSetName
		);
		Test.stopTest();

		System.assertNotEquals(
			null,
			fields,
			'Field set fields should not be null'
		);
		System.assert(
			fields.size() > 0,
			'Field set should return at least one field'
		);
	}

	@isTest
	static void testgetFieldNames_invalidObject() {
		try {
			FieldSetManager.getFieldNames(
				'InvalidObject__c',
				'SomeFieldSet'
			);
			System.assert(false, 'Expected exception for invalid object');
		} catch (Exception e) {
			System.assert(
				e.getMessage().contains('Invalid object'),
				'Unexpected exception message: ' +
					e.getMessage() + '\n' + 
					e.getStackTraceString()
			);
		}
	}

	@isTest
	static void testgetFieldNames_invalidFieldSet() {
		try {
			FieldSetManager.getFieldNames(
				'Account',
				'NonExistentFieldSet'
			);
			System.assert(false, 'Expected exception for invalid field set');
		} catch (Exception e) {
			System.assert(
				e.getMessage().contains('Invalid field set'),
				'Unexpected exception message: ' +
					e.getMessage() + '\n' + 
					e.getStackTraceString()
			);
		}
	}
}
