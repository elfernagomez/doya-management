/**
 * Imports Orders and Order Products from a customer-facing CSV template.
 */
public with sharing class OrderImportController {
	private static final String DEFAULT_TEMPLATE_KEY = 'Default';
	private static final String ORDER_OBJECT = 'Order';
	private static final String DELIVERY_GROUP_OBJECT = 'DeliveryGroup__c';
	private static final String ORDER_ITEM_OBJECT = 'OrderItem';

	public class MappingDef {
		@AuraEnabled public String templateKey;
		@AuraEnabled public String columnHeader;
		@AuraEnabled public String targetObject;
		@AuraEnabled public String targetFieldApi;
		@AuraEnabled public Decimal displayOrder;
		@AuraEnabled public Boolean isRequired;
		@AuraEnabled public String defaultValue;
		@AuraEnabled public String lookupObjectApi;
		@AuraEnabled public String lookupFieldApi;
	}

	public class TemplateResponse {
		@AuraEnabled public String fileName;
		@AuraEnabled public String csvContent;
		@AuraEnabled public List<MappingDef> mappings;
	}

	public class RowError {
		@AuraEnabled public Integer rowNumber;
		@AuraEnabled public String message;
	}

	public class ImportResponse {
		@AuraEnabled public Integer totalRows;
		@AuraEnabled public Integer ordersCreated;
		@AuraEnabled public Integer orderItemsCreated;
		@AuraEnabled public Integer failedRows;
		@AuraEnabled public List<Id> createdOrderIds;
		@AuraEnabled public List<RowError> rowErrors;
	}

	private class PendingRow {
		public Integer rowNumber;
		public String orderKey;
		public String groupKey;
		public OrderItem orderItem;
	}

	private class PendingOrder {
		public String orderKey;
		public Order orderRecord;
		public Date earliestDueDate;
	}

	private class PendingDeliveryGroup {
		public String groupKey;
		public String orderKey;
		public DeliveryGroup__c deliveryGroup;
	}

	@AuraEnabled(cacheable=true)
	public static TemplateResponse getTemplate() {
		List<MappingDef> mappings = getActiveMappings(DEFAULT_TEMPLATE_KEY);
		TemplateResponse response = new TemplateResponse();
		response.fileName = 'order-import-template.csv';
		response.mappings = mappings;
		response.csvContent = buildTemplateCsv(mappings);
		return response;
	}

	@AuraEnabled
	public static ImportResponse importCsv(String csvContent, Id accountId) {
		if (String.isBlank(csvContent)) {
			throw new AuraHandledException('CSV content is required.');
		}
		if (accountId == null) {
			throw new AuraHandledException('Customer is required.');
		}

		List<MappingDef> mappings = getActiveMappings(DEFAULT_TEMPLATE_KEY);
		if (mappings.isEmpty()) {
			throw new AuraHandledException('No active Order import mapping metadata found.');
		}

		Map<String, Schema.SObjectField> orderFields = Schema.SObjectType.Order.fields.getMap();
		Map<String, Schema.SObjectField> deliveryGroupFields = Schema.SObjectType.DeliveryGroup__c.fields.getMap();
		Map<String, Schema.SObjectField> orderItemFields = Schema.SObjectType.OrderItem.fields.getMap();
		validateMappings(mappings, orderFields, deliveryGroupFields, orderItemFields);

		List<List<String>> parsedCsv = parseCsv(csvContent);
		if (parsedCsv.isEmpty()) {
			throw new AuraHandledException('The uploaded CSV is empty.');
		}

		List<String> headers = parsedCsv[0];
		Map<String, Integer> headerIndexByNormalized = new Map<String, Integer>();
		for (Integer i = 0; i < headers.size(); i++) {
			headerIndexByNormalized.put(normalizeHeader(headers[i]), i);
		}

		ensureRequiredColumnsExist(mappings, headerIndexByNormalized);

		Map<Integer, List<String>> errorsByRow = new Map<Integer, List<String>>();
		Map<String, Set<String>> lookupValuesByMapping = collectLookupValues(mappings, parsedCsv, headerIndexByNormalized);
		Map<String, Map<String, Id>> lookupIdMapsByMapping = buildLookupIdMaps(mappings, lookupValuesByMapping);

		Map<String, PendingOrder> orderByKey = new Map<String, PendingOrder>();
		List<String> orderedKeys = new List<String>();
		Map<String, PendingDeliveryGroup> deliveryGroupByKey = new Map<String, PendingDeliveryGroup>();
		List<String> orderedGroupKeys = new List<String>();
		List<PendingRow> pendingRows = new List<PendingRow>();

		for (Integer csvIndex = 1; csvIndex < parsedCsv.size(); csvIndex++) {
			List<String> values = parsedCsv[csvIndex];
			Integer rowNumber = csvIndex + 1;
			if (isEmptyRow(values)) {
				continue;
			}

			Map<String, Object> orderValueMap = new Map<String, Object>();
			Map<String, Object> deliveryGroupValueMap = new Map<String, Object>();
			Map<String, Object> itemValueMap = new Map<String, Object>();

			for (MappingDef mapping : mappings) {
				Integer headerIndex = headerIndexByNormalized.get(normalizeHeader(mapping.columnHeader));
				String rawValue = headerIndex != null && headerIndex < values.size() ? values[headerIndex] : null;
				if (String.isBlank(rawValue)) {
					rawValue = mapping.defaultValue;
				}

				if (mapping.isRequired == true && String.isBlank(rawValue)) {
					addRowError(errorsByRow, rowNumber, 'Missing required value for column "' + mapping.columnHeader + '".');
					continue;
				}

				if (String.isBlank(rawValue)) {
					continue;
				}

				Object typedValue;
				if (!String.isBlank(mapping.lookupObjectApi)) {
					Map<String, Id> lookupMap = lookupIdMapsByMapping.get(mappingKey(mapping));
					String normalizedLookupValue = normalizeLookupValue(rawValue);
					Id lookupId = lookupMap == null ? null : lookupMap.get(normalizedLookupValue);
					if (lookupId == null) {
						String lookupFieldApi = String.isBlank(mapping.lookupFieldApi) ? 'Name' : mapping.lookupFieldApi;
						addRowError(errorsByRow, rowNumber, 'No ' + mapping.lookupObjectApi + ' found where ' + lookupFieldApi + ' = "' + rawValue + '" for column "' + mapping.columnHeader + '".');
						continue;
					}
					typedValue = lookupId;
				} else {
					typedValue = castValue(rawValue, getFieldDescribe(mapping, orderFields, deliveryGroupFields, orderItemFields));
				}

				if (ORDER_OBJECT.equalsIgnoreCase(mapping.targetObject)) {
					orderValueMap.put(mapping.targetFieldApi, typedValue);
				} else if (DELIVERY_GROUP_OBJECT.equalsIgnoreCase(mapping.targetObject)) {
					deliveryGroupValueMap.put(mapping.targetFieldApi, typedValue);
				} else {
					itemValueMap.put(mapping.targetFieldApi, typedValue);
				}
			}

			if (errorsByRow.containsKey(rowNumber)) {
				continue;
			}

			String orderReference = getStringValue(orderValueMap.get('Name'));
			String groupName = getStringValue(deliveryGroupValueMap.get('Name'));
			Date groupDueDate = (Date)deliveryGroupValueMap.get('DueDate__c');

			if (String.isBlank(orderReference)) {
				addRowError(errorsByRow, rowNumber, 'Order Reference Number is required.');
				continue;
			}
			if (String.isBlank(groupName)) {
				addRowError(errorsByRow, rowNumber, 'Delivery Group Name is required.');
				continue;
			}
			if (groupDueDate == null) {
				addRowError(errorsByRow, rowNumber, 'Due Date is required.');
				continue;
			}

			String orderKey = buildGroupingKey(orderReference);
			String groupKey = orderKey + '|' + String.valueOf(groupDueDate) + '|' + normalizeGroupingValue(groupName);

			if (!orderByKey.containsKey(orderKey)) {
				Order orderRecord = new Order(
					AccountId = accountId,
					Status = 'Draft',
					Name = orderReference
				);
				for (String fieldApi : orderValueMap.keySet()) {
					if (fieldApi == 'Name') {
						continue;
					}
					orderRecord.put(fieldApi, orderValueMap.get(fieldApi));
				}

				PendingOrder pendingOrder = new PendingOrder();
				pendingOrder.orderKey = orderKey;
				pendingOrder.orderRecord = orderRecord;
				pendingOrder.earliestDueDate = groupDueDate;
				orderByKey.put(orderKey, pendingOrder);
				orderedKeys.add(orderKey);
			} else if (groupDueDate != null) {
				PendingOrder existingOrder = orderByKey.get(orderKey);
				if (existingOrder.earliestDueDate == null || groupDueDate < existingOrder.earliestDueDate) {
					existingOrder.earliestDueDate = groupDueDate;
				}
			}

			if (!deliveryGroupByKey.containsKey(groupKey)) {
				DeliveryGroup__c deliveryGroupRecord = new DeliveryGroup__c(
					Name = groupName,
					DueDate__c = groupDueDate
				);
				for (String fieldApi : deliveryGroupValueMap.keySet()) {
						if (fieldApi == 'Name' || fieldApi == 'DueDate__c') {
						continue;
					}
					deliveryGroupRecord.put(fieldApi, deliveryGroupValueMap.get(fieldApi));
				}

				PendingDeliveryGroup pendingGroup = new PendingDeliveryGroup();
				pendingGroup.groupKey = groupKey;
				pendingGroup.orderKey = orderKey;
				pendingGroup.deliveryGroup = deliveryGroupRecord;
				deliveryGroupByKey.put(groupKey, pendingGroup);
				orderedGroupKeys.add(groupKey);
			}

			OrderItem orderItem = new OrderItem();
			for (String fieldApi : itemValueMap.keySet()) {
				orderItem.put(fieldApi, itemValueMap.get(fieldApi));
			}
			if (orderItem.Quantity == null) {
				orderItem.Quantity = 1;
			}

			PendingRow pending = new PendingRow();
			pending.rowNumber = rowNumber;
			pending.orderKey = orderKey;
			pending.groupKey = groupKey;
			pending.orderItem = orderItem;
			pendingRows.add(pending);
		}

		Map<String, Id> orderIdByKey = new Map<String, Id>();
		List<Id> createdOrderIds = new List<Id>();
		if (!orderByKey.isEmpty()) {
			List<Order> ordersToInsert = new List<Order>();
			for (String orderKey : orderedKeys) {
				PendingOrder pendingOrder = orderByKey.get(orderKey);
				if (pendingOrder.earliestDueDate != null) {
					pendingOrder.orderRecord.EffectiveDate = pendingOrder.earliestDueDate;
					pendingOrder.orderRecord.DueDate__c = pendingOrder.earliestDueDate;
				} else {
					pendingOrder.orderRecord.EffectiveDate = Date.today();
				}
				if (pendingOrder.orderRecord.Pricebook2Id == null) {
					pendingOrder.orderRecord.Pricebook2Id = getStandardPricebookId();
				}
				ordersToInsert.add(pendingOrder.orderRecord);
			}

			Database.SaveResult[] orderSaveResults = Database.insert(ordersToInsert, false);
			for (Integer i = 0; i < orderSaveResults.size(); i++) {
				String orderKey = orderedKeys[i];
				if (orderSaveResults[i].isSuccess()) {
					Id newOrderId = orderSaveResults[i].getId();
					orderIdByKey.put(orderKey, newOrderId);
					createdOrderIds.add(newOrderId);
					orderByKey.get(orderKey).orderRecord.Id = newOrderId;
				} else {
					String message = orderSaveResults[i].getErrors()[0].getMessage();
					for (PendingRow pending : pendingRows) {
						if (pending.orderKey == orderKey) {
							addRowError(errorsByRow, pending.rowNumber, 'Order creation failed: ' + message);
						}
					}
				}
			}
		}

		Map<String, Id> deliveryGroupIdByKey = new Map<String, Id>();
		if (!deliveryGroupByKey.isEmpty()) {
			List<DeliveryGroup__c> groupsToInsert = new List<DeliveryGroup__c>();
			for (String groupKey : orderedGroupKeys) {
				PendingDeliveryGroup pendingGroup = deliveryGroupByKey.get(groupKey);
				Id orderId = orderIdByKey.get(pendingGroup.orderKey);
				if (orderId == null) {
					continue;
				}
				pendingGroup.deliveryGroup.Order__c = orderId;
				groupsToInsert.add(pendingGroup.deliveryGroup);
			}

			Database.SaveResult[] groupSaveResults = Database.insert(groupsToInsert, false);
			Integer groupIndex = 0;
			for (String groupKey : orderedGroupKeys) {
				PendingDeliveryGroup pendingGroup = deliveryGroupByKey.get(groupKey);
				Id orderId = orderIdByKey.get(pendingGroup.orderKey);
				if (orderId == null) {
					continue;
				}

				Database.SaveResult saveResult = groupSaveResults[groupIndex++];
				if (saveResult.isSuccess()) {
					deliveryGroupIdByKey.put(groupKey, saveResult.getId());
					pendingGroup.deliveryGroup.Id = saveResult.getId();
				} else {
					String message = saveResult.getErrors()[0].getMessage();
					for (PendingRow pending : pendingRows) {
						if (pending.groupKey == groupKey) {
							addRowError(errorsByRow, pending.rowNumber, 'Delivery group creation failed: ' + message);
						}
					}
				}
			}
		}

		List<OrderItem> orderItemsToInsert = new List<OrderItem>();
		List<Integer> rowNumbersForOrderItems = new List<Integer>();
		Map<Id, Id> orderPricebookById = new Map<Id, Id>();
		for (String orderKey : orderIdByKey.keySet()) {
			PendingOrder o = orderByKey.get(orderKey);
			orderPricebookById.put(orderIdByKey.get(orderKey), o.orderRecord.Pricebook2Id);
		}

		for (PendingRow pending : pendingRows) {
			if (errorsByRow.containsKey(pending.rowNumber)) {
				continue;
			}
			Id orderId = orderIdByKey.get(pending.orderKey);
			Id deliveryGroupId = deliveryGroupIdByKey.get(pending.groupKey);
			if (orderId == null || deliveryGroupId == null) {
				continue;
			}

			pending.orderItem.OrderId = orderId;
			pending.orderItem.DeliveryGroup__c = deliveryGroupId;
			if (pending.orderItem.Product2Id == null) {
				addRowError(errorsByRow, pending.rowNumber, 'Product lookup is required for Order Product rows.');
				continue;
			}
			orderItemsToInsert.add(pending.orderItem);
			rowNumbersForOrderItems.add(pending.rowNumber);
		}

		setPricebookEntries(orderItemsToInsert, rowNumbersForOrderItems, orderPricebookById, errorsByRow);

		List<OrderItem> finalItemsToInsert = new List<OrderItem>();
		List<Integer> finalItemRowNumbers = new List<Integer>();
		for (Integer i = 0; i < orderItemsToInsert.size(); i++) {
			if (!errorsByRow.containsKey(rowNumbersForOrderItems[i])) {
				finalItemsToInsert.add(orderItemsToInsert[i]);
				finalItemRowNumbers.add(rowNumbersForOrderItems[i]);
			}
		}

		Integer createdOrderItems = 0;
		if (!finalItemsToInsert.isEmpty()) {
			Database.SaveResult[] itemResults = Database.insert(finalItemsToInsert, false);
			for (Integer i = 0; i < itemResults.size(); i++) {
				if (itemResults[i].isSuccess()) {
					createdOrderItems++;
				} else {
					addRowError(errorsByRow, finalItemRowNumbers[i], 'Order Product creation failed: ' + itemResults[i].getErrors()[0].getMessage());
				}
			}
		}

		ImportResponse response = new ImportResponse();
		response.totalRows = countDataRows(parsedCsv);
		response.ordersCreated = createdOrderIds.size();
		response.orderItemsCreated = createdOrderItems;
		response.rowErrors = flattenErrors(errorsByRow);
		response.failedRows = errorsByRow.size();
		response.createdOrderIds = createdOrderIds;
		return response;
	}

	private static List<MappingDef> getActiveMappings(String templateKey) {
		List<MappingDef> mappings = new List<MappingDef>();
		for (SObject row : Database.query(
			'SELECT Template_Key__c, Column_Header__c, Target_Object__c, Target_Field_Api__c, ' +
			'Display_Order__c, Is_Required__c, Default_Value__c, Lookup_Object_Api__c, Lookup_Field_Api__c ' +
			'FROM OrderImportColumnMap__mdt ' +
			'WHERE Template_Key__c = :templateKey AND Is_Active__c = true ' +
			'ORDER BY Display_Order__c ASC, Column_Header__c ASC'
		)) {
			MappingDef mapping = new MappingDef();
			mapping.templateKey = (String)row.get('Template_Key__c');
			mapping.columnHeader = (String)row.get('Column_Header__c');
			mapping.targetObject = (String)row.get('Target_Object__c');
			mapping.targetFieldApi = (String)row.get('Target_Field_Api__c');
			mapping.displayOrder = (Decimal)row.get('Display_Order__c');
			mapping.isRequired = (Boolean)row.get('Is_Required__c');
			mapping.defaultValue = (String)row.get('Default_Value__c');
			mapping.lookupObjectApi = (String)row.get('Lookup_Object_Api__c');
			mapping.lookupFieldApi = (String)row.get('Lookup_Field_Api__c');
			mappings.add(mapping);
		}
		return mappings;
	}

	private static String buildTemplateCsv(List<MappingDef> mappings) {
		List<String> headers = new List<String>();
		List<String> sampleValues = new List<String>();
		for (MappingDef mapping : mappings) {
			headers.add(escapeCsvValue(mapping.columnHeader));
			sampleValues.add(escapeCsvValue(sampleValueForMapping(mapping)));
		}
		return String.join(headers, ',') + '\n' + String.join(sampleValues, ',') + '\n';
	}

	private static String sampleValueForMapping(MappingDef mapping) {
		if (!String.isBlank(mapping.defaultValue)) {
			return mapping.defaultValue;
		}
		if (!String.isBlank(mapping.lookupObjectApi)) {
			return 'Sample ' + mapping.columnHeader;
		}
		if ('Name'.equalsIgnoreCase(mapping.targetFieldApi)) {
			return 'Order Name';
		}
		if ('DueDate__c'.equalsIgnoreCase(mapping.targetFieldApi)) {
			return String.valueOf(Date.today());
		}
		if ('Name'.equalsIgnoreCase(mapping.targetFieldApi)) {
			return 'Delivery Group 1';
		}
		if ('Quantity'.equalsIgnoreCase(mapping.targetFieldApi)) {
			return '1';
		}
		return '';
	}

	private static void validateMappings(
		List<MappingDef> mappings,
		Map<String, Schema.SObjectField> orderFields,
		Map<String, Schema.SObjectField> deliveryGroupFields,
		Map<String, Schema.SObjectField> itemFields
	) {
		for (MappingDef mapping : mappings) {
			if (ORDER_OBJECT.equalsIgnoreCase(mapping.targetObject)) {
				if (!orderFields.containsKey(mapping.targetFieldApi)) {
					throw new AuraHandledException('Invalid mapping metadata. Order field not found: ' + mapping.targetFieldApi);
				}
			} else if (DELIVERY_GROUP_OBJECT.equalsIgnoreCase(mapping.targetObject)) {
				if (!deliveryGroupFields.containsKey(mapping.targetFieldApi)) {
					throw new AuraHandledException('Invalid mapping metadata. DeliveryGroup field not found: ' + mapping.targetFieldApi);
				}
			} else if (ORDER_ITEM_OBJECT.equalsIgnoreCase(mapping.targetObject)) {
				if (!itemFields.containsKey(mapping.targetFieldApi)) {
					throw new AuraHandledException('Invalid mapping metadata. OrderItem field not found: ' + mapping.targetFieldApi);
				}
			} else {
				throw new AuraHandledException('Invalid mapping metadata. Unsupported target object: ' + mapping.targetObject);
			}
		}
	}

	private static void ensureRequiredColumnsExist(
		List<MappingDef> mappings,
		Map<String, Integer> headerIndexByNormalized
	) {
		for (MappingDef mapping : mappings) {
			if (mapping.isRequired != true) {
				continue;
			}
			if (headerIndexByNormalized.containsKey(normalizeHeader(mapping.columnHeader))) {
				continue;
			}
			if (String.isBlank(mapping.defaultValue)) {
				throw new AuraHandledException('Required column missing from CSV: ' + mapping.columnHeader);
			}
		}
	}

	private static Map<String, Set<String>> collectLookupValues(
		List<MappingDef> mappings,
		List<List<String>> parsedCsv,
		Map<String, Integer> headerIndexByNormalized
	) {
		Map<String, Set<String>> lookupValuesByMapping = new Map<String, Set<String>>();
		for (MappingDef mapping : mappings) {
			if (String.isBlank(mapping.lookupObjectApi)) {
				continue;
			}
			lookupValuesByMapping.put(mappingKey(mapping), new Set<String>());
		}

		for (Integer csvIndex = 1; csvIndex < parsedCsv.size(); csvIndex++) {
			List<String> values = parsedCsv[csvIndex];
			if (isEmptyRow(values)) {
				continue;
			}
			for (MappingDef mapping : mappings) {
				if (String.isBlank(mapping.lookupObjectApi)) {
					continue;
				}
				Integer headerIndex = headerIndexByNormalized.get(normalizeHeader(mapping.columnHeader));
				String rawValue = headerIndex != null && headerIndex < values.size() ? values[headerIndex] : null;
				if (String.isBlank(rawValue)) {
					rawValue = mapping.defaultValue;
				}
				if (!String.isBlank(rawValue)) {
					lookupValuesByMapping.get(mappingKey(mapping)).add(rawValue);
				}
			}
		}
		return lookupValuesByMapping;
	}

	private static Map<String, Map<String, Id>> buildLookupIdMaps(
		List<MappingDef> mappings,
		Map<String, Set<String>> lookupValuesByMapping
	) {
		Map<String, Map<String, Id>> result = new Map<String, Map<String, Id>>();
		for (MappingDef mapping : mappings) {
			if (String.isBlank(mapping.lookupObjectApi)) {
				continue;
			}
			String key = mappingKey(mapping);
			if (result.containsKey(key)) {
				continue;
			}

			Set<String> lookupValues = lookupValuesByMapping.get(key);
			Map<String, Id> idsByNormalizedValue = new Map<String, Id>();
			if (lookupValues != null && !lookupValues.isEmpty()) {
				String lookupFieldApi = String.isBlank(mapping.lookupFieldApi) ? 'Name' : mapping.lookupFieldApi;
				String query = 'SELECT Id, ' + lookupFieldApi + ' FROM ' + mapping.lookupObjectApi +
					' WHERE ' + lookupFieldApi + ' IN :lookupValues';
				for (SObject row : Database.query(query)) {
					Object rawValue = row.get(lookupFieldApi);
					if (rawValue == null) {
						continue;
					}
					String normalizedValue = normalizeLookupValue(String.valueOf(rawValue));
					if (!idsByNormalizedValue.containsKey(normalizedValue)) {
						idsByNormalizedValue.put(normalizedValue, (Id)row.get('Id'));
					}
				}
			}
			result.put(key, idsByNormalizedValue);
		}
		return result;
	}

	private static void setPricebookEntries(
		List<OrderItem> orderItems,
		List<Integer> rowNumbers,
		Map<Id, Id> orderPricebookById,
		Map<Integer, List<String>> errorsByRow
	) {
		if (orderItems.isEmpty()) {
			return;
		}

		Set<Id> productIds = new Set<Id>();
		Set<Id> pricebookIds = new Set<Id>();
		for (OrderItem item : orderItems) {
			if (item.Product2Id != null) {
				productIds.add(item.Product2Id);
			}
			Id pricebookId = orderPricebookById.get(item.OrderId);
			if (pricebookId != null) {
				pricebookIds.add(pricebookId);
			}
		}
		Id standardPricebookId = getStandardPricebookId();
		if (standardPricebookId != null) {
			pricebookIds.add(standardPricebookId);
		}

		Map<String, PricebookEntry> pbeByProductAndPricebook = new Map<String, PricebookEntry>();
		if (!productIds.isEmpty() && !pricebookIds.isEmpty()) {
			for (PricebookEntry pbe : [
				SELECT Id, Product2Id, Pricebook2Id, UnitPrice
				FROM PricebookEntry
				WHERE Product2Id IN :productIds
				AND Pricebook2Id IN :pricebookIds
				AND IsActive = true
			]) {
				String key = String.valueOf(pbe.Product2Id) + '|' + String.valueOf(pbe.Pricebook2Id);
				if (!pbeByProductAndPricebook.containsKey(key)) {
					pbeByProductAndPricebook.put(key, pbe);
				}
			}
		}

		for (Integer i = 0; i < orderItems.size(); i++) {
			OrderItem item = orderItems[i];
			if (item.Product2Id == null) {
				continue;
			}

			Id pricebookId = orderPricebookById.get(item.OrderId);
			if (pricebookId == null) {
				pricebookId = standardPricebookId;
			}

			String key = String.valueOf(item.Product2Id) + '|' + String.valueOf(pricebookId);
			PricebookEntry pbe = pbeByProductAndPricebook.get(key);
			if (pbe == null && standardPricebookId != null) {
				String fallbackKey = String.valueOf(item.Product2Id) + '|' + String.valueOf(standardPricebookId);
				pbe = pbeByProductAndPricebook.get(fallbackKey);
			}

			if (pbe == null) {
				addRowError(errorsByRow, rowNumbers[i], 'No active Pricebook Entry found for product on this order.');
				continue;
			}

			item.PricebookEntryId = pbe.Id;
			if (item.BasePrice__c == null) {
				item.BasePrice__c = pbe.UnitPrice;
			}
			if (item.UnitPrice == null) {
				item.UnitPrice = pbe.UnitPrice;
			}
		}
	}

	private static Schema.DescribeFieldResult getFieldDescribe(
		MappingDef mapping,
		Map<String, Schema.SObjectField> orderFields,
		Map<String, Schema.SObjectField> deliveryGroupFields,
		Map<String, Schema.SObjectField> itemFields
	) {
		if (ORDER_OBJECT.equalsIgnoreCase(mapping.targetObject)) {
			return orderFields.get(mapping.targetFieldApi).getDescribe();
		}
		if (DELIVERY_GROUP_OBJECT.equalsIgnoreCase(mapping.targetObject)) {
			return deliveryGroupFields.get(mapping.targetFieldApi).getDescribe();
		}
		return itemFields.get(mapping.targetFieldApi).getDescribe();
	}

	private static Object castValue(String rawValue, Schema.DescribeFieldResult describeField) {
		String value = rawValue == null ? null : rawValue.trim();
		if (String.isBlank(value)) {
			return null;
		}

		Schema.DisplayType fieldType = describeField.getType();
		if (fieldType == Schema.DisplayType.Boolean) {
			String lowered = value.toLowerCase();
			return lowered == 'true' || lowered == '1' || lowered == 'yes' || lowered == 'y';
		}
		if (fieldType == Schema.DisplayType.Date) {
			return Date.valueOf(value);
		}
		if (fieldType == Schema.DisplayType.DateTime) {
			String normalized = value.replace('T', ' ');
			return DateTime.valueOf(normalized);
		}
		if (
			fieldType == Schema.DisplayType.Currency ||
			fieldType == Schema.DisplayType.Double ||
			fieldType == Schema.DisplayType.Percent
		) {
			return Decimal.valueOf(value);
		}
		if (fieldType == Schema.DisplayType.Integer) {
			return Integer.valueOf(value);
		}
		if (fieldType == Schema.DisplayType.Reference || fieldType == Schema.DisplayType.Id) {
			return (Id)value;
		}

		return value;
	}

	private static String buildGroupingKey(String value) {
		return normalizeGroupingValue(value);
	}

	private static String mappingKey(MappingDef mapping) {
		return mapping.lookupObjectApi + '|' + (String.isBlank(mapping.lookupFieldApi) ? 'Name' : mapping.lookupFieldApi);
	}

	private static List<RowError> flattenErrors(Map<Integer, List<String>> errorsByRow) {
		List<Integer> orderedRows = new List<Integer>(errorsByRow.keySet());
		orderedRows.sort();
		List<RowError> rowErrors = new List<RowError>();
		for (Integer row : orderedRows) {
			for (String message : errorsByRow.get(row)) {
				RowError error = new RowError();
				error.rowNumber = row;
				error.message = message;
				rowErrors.add(error);
			}
		}
		return rowErrors;
	}

	private static void addRowError(Map<Integer, List<String>> errorsByRow, Integer rowNumber, String message) {
		if (!errorsByRow.containsKey(rowNumber)) {
			errorsByRow.put(rowNumber, new List<String>());
		}
		errorsByRow.get(rowNumber).add(message);
	}

	private static Integer countDataRows(List<List<String>> parsedCsv) {
		Integer count = 0;
		for (Integer i = 1; i < parsedCsv.size(); i++) {
			if (!isEmptyRow(parsedCsv[i])) {
				count++;
			}
		}
		return count;
	}

	private static Boolean isEmptyRow(List<String> values) {
		if (values == null || values.isEmpty()) {
			return true;
		}
		for (String value : values) {
			if (!String.isBlank(value)) {
				return false;
			}
		}
		return true;
	}

	private static String normalizeHeader(String value) {
		return String.isBlank(value) ? '' : value.trim().toLowerCase();
	}

	private static String normalizeLookupValue(String value) {
		return String.isBlank(value) ? '' : value.trim().toLowerCase();
	}

	private static String normalizeGroupingValue(String value) {
		return String.isBlank(value) ? '' : value.trim().toLowerCase();
	}

	private static String getStringValue(Object value) {
		return value == null ? null : String.valueOf(value);
	}

	private static String escapeCsvValue(String value) {
		String safe = value == null ? '' : value;
		String escaped = safe.replace('"', '""');
		if (escaped.contains(',') || escaped.contains('"') || escaped.contains('\n') || escaped.contains('\r')) {
			return '"' + escaped + '"';
		}
		return escaped;
	}

	private static List<List<String>> parseCsv(String csv) {
		List<List<String>> rows = new List<List<String>>();
		List<String> currentRow = new List<String>();
		String currentValue = '';
		Boolean inQuotes = false;

		for (Integer i = 0; i < csv.length(); i++) {
			String ch = csv.substring(i, i + 1);
			String nextCh = i + 1 < csv.length() ? csv.substring(i + 1, i + 2) : null;

			if (ch == '"') {
				if (inQuotes && nextCh == '"') {
					currentValue += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
				continue;
			}

			if (!inQuotes && ch == ',') {
				currentRow.add(currentValue);
				currentValue = '';
				continue;
			}

			if (!inQuotes && (ch == '\n' || ch == '\r')) {
				if (ch == '\r' && nextCh == '\n') {
					i++;
				}
				currentRow.add(currentValue);
				rows.add(currentRow);
				currentRow = new List<String>();
				currentValue = '';
				continue;
			}

			currentValue += ch;
		}

		currentRow.add(currentValue);
		rows.add(currentRow);
		return rows;
	}

	private static Id getStandardPricebookId() {
		List<Pricebook2> rows = [
			SELECT Id
			FROM Pricebook2
			WHERE IsStandard = true
			LIMIT 1
		];
		return rows.isEmpty() ? null : rows[0].Id;
	}
}
