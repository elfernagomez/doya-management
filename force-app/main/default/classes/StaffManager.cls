/**
 * Controls: WorkOrderListView (LWC)
 * @author Fernando Gomez
 * @version 1.0
 * @since 4/9/2025
 */
public with sharing class StaffManager {

	private static final String PREVIEW_URL =
		'/sfc/servlet.shepherd/version/renditionDownload' +
		'?rendition=ORIGINAL_Png&versionId={0}&operationContext=CHATTER';

	public StaffManager() {

	}

	/**
	 * Returns info about the staff member if PIN matches.
	 * Null is returned if PIN is incorrect, employee is not active, etc.
	 * @param staffId
	 * @param pin
	 */
	@AuraEnabled
	public static Staff staffLogin(
		Id staffId,
		String pin
	) {
		List<Staff__c> staffQueryResult;
		List<ContentDocumentLink> docLinks;
		Staff__c staffRecord;
		ContentVersion profilePic;
		String photoUrl;

		try {
			staffQueryResult = [
				SELECT FirstName__c,
					LastName__c,
					FullName__c,
					PositionName__c,
					PIN__c
				FROM Staff__c
				WHERE Id = :staffId
				AND IsActive__c = true
				LIMIT 1
			];

			if (staffQueryResult.isEmpty())
				return null;

			// staff found with proper PIN
			staffRecord = staffQueryResult[0];

			// if pin is incorrect, we return null
			if (staffRecord.PIN__c != pin)
				return null;

			// we find the photo file, if any
			docLinks = [
				SELECT ContentDocument.LatestPublishedVersionId
				FROM ContentDocumentLink
				WHERE LinkedEntityId = :staffRecord.Id
				AND ContentDocument.LatestPublishedVersion.ProfilePhoto__c = true
				LIMIT 1
			];
			
			if (!docLinks.isEmpty()) {
				photoUrl = String.format(
					PREVIEW_URL,
					new List<String> {
						docLinks[0].ContentDocument.LatestPublishedVersionId
					});
			}

			return new Staff(staffRecord, photoUrl);
		} catch (Exception ex) {
			throw new AuraHandledException(ex.getMessage());
		}
	}

	public class Staff {
		@AuraEnabled
		public String firstName;

		@AuraEnabled
		public String lastName;

		@AuraEnabled
		public String fullName;

		@AuraEnabled
		public String position;

		@AuraEnabled
		public String photoUrl;

		/**
		 * staffRecord
		 * photoUrl
		 */
		public Staff(Staff__c staffRecord, String photoUrl) {
			firstName = staffRecord.FirstName__c;
			lastName = staffRecord.LastName__c;
			fullName = staffRecord.FullName__c;
			position = staffRecord.PositionName__c;
			this.photoUrl = photoUrl;
		}
	}
}