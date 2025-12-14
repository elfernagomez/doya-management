/**
 * RecordSearchCtrl
 *
 * Provides a safe dynamic search for records on a given object. Supports:
 *  - multiple display fields
 *  - a searchTerm applied to the primary display field
 *  - optional lookupFilters (list of maps with fieldPath/operator/value)
 *
 * lookupFilters expected format (each map):
 *  {
 *      'fieldPath' : 'MyField__c',
 *      'operator'  : 'equals' | 'like' | 'contains' | 'startsWith' | 'in' | 'notEquals',
 *      'value'     : 'some value' // for IN use comma-separated values
 *  }
 *
 * Only filters against textual-ish fields are applied (STRING, ID, PICKLIST, PHONE, EMAIL, URL, TEXTAREA).
 *
 * @since 1.0.0
 */
public with sharing class RecordSearchCtrl {
    @AuraEnabled
    public static List<Map<String, Object>> searchRecords(
        String objectApiName,
        String searchTerm,
        List<String> displayFields,
        Integer limitSize,
        List<Map<String, String>> lookupFilters
    ) {
        if (String.isBlank(objectApiName)) {
            return new List<Map<String, Object>>();
        }
        if (limitSize == null) {
            limitSize = 50;
        }

        Map<String, Schema.SObjectType> gd = Schema.getGlobalDescribe();
        if (!gd.containsKey(objectApiName)) {
            throw new AuraHandledException('Invalid object: ' + objectApiName);
        }

        Schema.DescribeSObjectResult dr = gd.get(objectApiName).getDescribe();
        Map<String, Schema.SObjectField> fieldsMap = dr.fields.getMap();

        // Ensure displayFields contains at least one valid field (fallback to Name)
        List<String> dfList = new List<String>();
        if (displayFields != null && !displayFields.isEmpty()) {
            for (String f : displayFields) {
                if (String.isNotBlank(f) && fieldsMap.containsKey(f)) {
                    dfList.add(f);
                }
            }
        }
        if (dfList.isEmpty()) {
            String fallback = fieldsMap.containsKey('Name') ? 'Name' : (fieldsMap.keySet().iterator().hasNext() ? fieldsMap.keySet().iterator().next() : null);
            if (fallback != null) dfList.add(fallback);
        }
        if (dfList.isEmpty()) {
            // No valid fields available
            return new List<Map<String, Object>>();
        }

        // Build safe SELECT list (ensure Id present)
        String selectList = 'Id';
        for (String f : dfList) {
            if (f != 'Id') selectList += ', ' + f;
        }

        // Build WHERE clauses: searchTerm clause + lookupFilters clauses
        List<String> whereClauses = new List<String>();

        // primary searchTerm on first display field
        String primaryField = dfList[0];
        if (String.isNotBlank(searchTerm)) {
            String safeSearch = '%' + String.escapeSingleQuotes(searchTerm) + '%';
            whereClauses.add(primaryField + ' LIKE \'' + safeSearch + '\'');
        }

        // process lookupFilters (if any)
        if (lookupFilters != null && !lookupFilters.isEmpty()) {
            for (Map<String, String> f : lookupFilters) {
                if (f == null) continue;
                String fieldPath = f.get('fieldPath');
                String operatorRaw = (f.get('operator') == null) ? '' : f.get('operator').trim().toLowerCase();
                String value = f.get('value');

                if (String.isBlank(fieldPath) || String.isBlank(operatorRaw)) continue;
                if (!fieldsMap.containsKey(fieldPath)) continue;

                Schema.DescribeFieldResult fr = fieldsMap.get(fieldPath).getDescribe();
                Schema.DisplayType dt = fr.getType();

                // helper to determine if field is numeric or boolean
                Boolean isNumericType = (dt == Schema.DisplayType.Double
                    || dt == Schema.DisplayType.Integer
                    || dt == Schema.DisplayType.Long
                    || dt == Schema.DisplayType.Currency
                    || dt == Schema.DisplayType.Percent);

                Boolean isBooleanType = (dt == Schema.DisplayType.Boolean);

                // normalize operator to common short codes used by lightning-record-picker
                String op;
                if (operatorRaw == 'eq' || operatorRaw == 'equals' || operatorRaw == '=') {
                    op = '=';
                } else if (operatorRaw == 'ne' || operatorRaw == 'neq' || operatorRaw == 'not_equals' || operatorRaw == 'notequals' || operatorRaw == '!=' ) {
                    op = '!=';
                } else if (operatorRaw == 'like' || operatorRaw == 'contains') {
                    op = 'LIKE';
                } else if (operatorRaw == 'startswith' || operatorRaw == 'startsWith' || operatorRaw == 'starts_with') {
                    op = 'STARTS';
                } else if (operatorRaw == 'in') {
                    op = 'IN';
                } else if (operatorRaw == 'gt' || operatorRaw == 'greaterthan' || operatorRaw == '>') {
                    op = '>';
                } else if (operatorRaw == 'gte' || operatorRaw == 'greaterthanorequal' || operatorRaw == '>=' ) {
                    op = '>=';
                } else if (operatorRaw == 'lt' || operatorRaw == 'lessthan' || operatorRaw == '<') {
                    op = '<';
                } else if (operatorRaw == 'lte' || operatorRaw == 'lessthanorequal' || operatorRaw == '<=' ) {
                    op = '<=';
                } else {
                    // unsupported operator - ignore
                    continue;
                }

                // Build clause based on operator and field type
                if (op == 'IN') {
                    if (String.isBlank(value)) continue;
                    List<String> parts = new List<String>();
                    for (String v : value.split(',')) {
                        String s = v.trim();
                        if (s == '') continue;
                        if (isNumericType) {
                            // validate numeric
                            try {
                                System.Decimal.valueOf(s);
                                parts.add(s);
                            } catch (Exception ex) {
                                // skip invalid numeric
                            }
                        } else if (isBooleanType) {
                            String low = s.toLowerCase();
                            if (low == 'true' || low == 'false') {
                                parts.add(low);
                            } // else skip invalid boolean token
                        } else {
                            parts.add('\'' + String.escapeSingleQuotes(s) + '\'');
                        }
                    }
                    if (!parts.isEmpty()) {
                        whereClauses.add(fieldPath + ' IN (' + String.join(parts, ',') + ')');
                    }
                } else if (op == 'LIKE' || op == 'STARTS') {
                    // LIKE/STARTS only makes sense for text-like fields
                    String safe = String.escapeSingleQuotes(value == null ? '' : value);
                    if (op == 'LIKE') {
                        whereClauses.add(fieldPath + ' LIKE \'%' + safe + '%\'');
                    } else {
                        whereClauses.add(fieldPath + ' LIKE \'' + safe + '%\'');
                    }
                } else if (op == '=' || op == '!=') {
                    String safe = String.escapeSingleQuotes(value == null ? '' : value);
                    // Boolean handling
                    if (isBooleanType) {
                        String low = (value == null ? '' : value.trim().toLowerCase());
                        if (low == 'true' || low == 'false') {
                            whereClauses.add(fieldPath + ' ' + op + ' ' + low);
                        } else {
                            // invalid boolean value, skip filter
                            continue;
                        }
                    } else if (isNumericType) {
                        // For numeric types, avoid quotes if value is numeric
                        try {
                            if (String.isBlank(safe)) {
                                // consider this as valid numeric (empty)
                                whereClauses.add(fieldPath + ' ' + op + ' null');
                            } else {
                                System.Decimal.valueOf(safe);
                                whereClauses.add(fieldPath + ' ' + op + ' ' + safe);
                            }
                        } catch (Exception ex) {
                            // invalid numeric value -> skip filter
                            continue;
                        }
                    } else {
                        whereClauses.add(fieldPath + ' ' + op + ' \'' + safe + '\'');
                    }
                } else if (op == '>' || op == '>=' || op == '<' || op == '<=') {
                    String rawVal = value == null ? '' : value.trim();
                    if (isNumericType) {
                        try {
                            if (String.isBlank(rawVal)) {
                                // consider this as valid numeric (empty)
                                whereClauses.add(fieldPath + ' ' + op + ' null');
                            } else {
                                System.Decimal.valueOf(rawVal);
                                whereClauses.add(fieldPath + ' ' + op + ' ' + rawVal);
                            }
                        } catch (Exception ex) {
                            // invalid numeric value -> skip filter
                            continue;
                        }
                    } else if (dt == Schema.DisplayType.Date || dt == Schema.DisplayType.DateTime) {
                        // Quote date/datetime values; caller should pass ISO-ish string (yyyy-MM-dd or yyyy-MM-ddTHH:mm:ss)
                        String safe = String.escapeSingleQuotes(rawVal);
                        whereClauses.add(fieldPath + ' ' + op + ' \'' + safe + '\'');
                    } else {
                        // For other types, attempt quoted comparison
                        String safe = String.escapeSingleQuotes(rawVal);
                        whereClauses.add(fieldPath + ' ' + op + ' \'' + safe + '\'');
                    }
                }
            }
        }

        String whereClause = '';
        if (!whereClauses.isEmpty()) {
            whereClause = ' WHERE ' + String.join(whereClauses, ' AND ');
        }

        String q = 'SELECT ' + selectList + ' FROM ' + objectApiName + whereClause +
            ' ORDER BY CreatedDate DESC LIMIT ' + limitSize;

        System.debug('RecordSearchCtrl.searchRecords - Query: ' + q);
        List<SObject> rows = Database.query(q);
        List<Map<String, Object>> out = new List<Map<String, Object>>();
        for (SObject s : rows) {
            out.add(s.getPopulatedFieldsAsMap());
        }
        return out;
    }
}