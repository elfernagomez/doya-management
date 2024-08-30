import { LightningElement, api } from 'lwc';

/**
 * Base component with common functions
 * @author Fernando Gomez
 * @version 1.0
 */
export default class LwcBase extends LightningElement {

	
	/**
	 * Error reporting for components
	 * @see c:errorPanel
	 */
	isError = false;
	errorTitle;
	errorObject;

	/**
	 * Decalres the exitence of an error
	 * @returns boolean
	 */
	get hasError() {
		return this.isError;
	}

	/**
	 * Generic error reporting function for components
	 * @param {*} message 
	 * @param {*} error 
	 */
	addError(message, error) {
		console.error(error);
		this.isError = true;
		this.errorTitle = message;
		this.errorObject = error;
	}

	/**
	 * Removes any errors.
	 * @param {*} message 
	 * @param {*} error 
	 */
	removeError(message, error) {
		this.isError = false;
		this.errorTitle = null;
		this.errorObject = null;
	}

	/**
	 * Return TRUE if both ids are the same, taking into
	 * account that salesforce Id might be 15 or 18 characters
	 * long. The same ID has a 15 character and an 18 character
	 * version. 
	 * "0Hn7c000000H8cvCAC" == "0Hn7c000000H8cv" => true
	 * "1te7c0000004EiVAAU" == "0Hn7c000000H8cv" => false
	 * @param {*} id1 
	 * @param {*} id2 
	 * @return boolean
	 */
	@api
	compareSalesforceIds(id1, id2) {
		if (id1 != null && id2 != null)
			return id1.slice(0,15) == id2.slice(0,15);
		return id1 == id2;
	}

	@api
	deepClone(obj) {
		return JSON.parse(JSON.stringify(obj));
	}

	/**
	 * Logs the object as a string.
	 * It stringifies the object.
	 * @param {*} obj 
	 * @param {*} title [optional]
	 */
	@api
	logAsString(obj, title) {
		if (title)
			console.log(title, JSON.stringify(obj));
		else
			console.log(JSON.stringify(obj));
	}

	/**
	 * Logs the object as a cloned object.
	 * A new object is created and logged into the console
	 * @param {*} obj 
	 * @param {*} title [optional]
	 */
	@api
	logAsObject(obj, title) {
		if (title)
			console.log(title, this.deepClone(obj));
		else
			console.log(this.deepClone(obj));
	}

	/**
	 * 
	 * @param {*} obj 
	 * @param {*} title 
	 */
	logAsStringPretty(obj, title) {
		if (title)
			console.log(title, JSON.stringify(obj, null, 2));
		else
			console.log(JSON.stringify(obj, null, 2));
	}

	/**
	 * @param {*} x 
	 * @param {*} prescision 
	 * @returns a rounded version of the number specified.
	 * The rounding is done considering the specified
	 * precision (decimal point):
	 * roundToPrecision(5.1651564, 3) = 5.165
	 * roundToPrecision(5.1651564, 0) = 5
	 * roundToPrecision(5.1651564, 1) = 5.2
	 */
	@api
	roundToPrecision = (x, prescision) => {
		let multiplier = 10 ** prescision;
		return Math.round(x * multiplier) / multiplier;
	};

	/**
	 * @param {*} sortedList list must be sorted or the bynary search won't work
	 * @param {*} value 
	 * @returns the index representing the position of the searched value,
	 * null if not found. The incoming list of values (sortedList) is expected
	 * to be sorted. This method workes for primitive types for which
	 * comparison is be implicit.
	 */
	@api
	binarySearch(sortedList, value) {
		return this._binarySearch(sortedList, value, 0, sortedList.length);
	}

	/**
	 * Dispatches (throws) a custom event with
	 * the specified name and details. To catch
	 * this event, use the on{event_name} in the
	 * attributes of the component.
	 * @param {*} evenName 
	 * @param {*} eventDetail 
	 */
	@api
	customEvent(evenName, eventDetail) {
		this.dispatchEvent(new CustomEvent(evenName, {
			detail: eventDetail
		}));
	}
	
	/**
	 * Validates all imputs with the specified
	 * selector. Shows any errors based on the inputs
	 * defined validation contratins.
	 * @param {*} selector 
	 * @returns true if all components are good,
	 * false if at least one is faulty.
	 */
	validateInputs(selector) {
		let isValid = true;
		let inputFields = this.template.querySelectorAll(selector);
		
		inputFields.forEach(inputField => {
			if (!inputField.checkValidity()) {
				inputField.reportValidity();

				// we move it to false if it hasnt been
				if (isValid)
					isValid = false;
			}
		});

		return isValid;
	}

	/**
	 * @param {*} selector
	 * @returns the component with the specified selector
	 */
	getComponent(selector) {
		return this.template.querySelector(selector);
	}

	/**
	 * @param {*} selector
	 * @returns the components with the specified selector
	 */
	getAllComponents(selector) {
		return this.template.querySelectorAll(selector);
	}

	/**
	 * @param {*} str 
	 * @returns 
	 */
	toSentenceCase(str) {
		return !str ?
			str :
			str.split(" ")
				.map(st => (st ? (st.charAt(0).toUpperCase() +
					st.substring(1).toLowerCase()) : ""))
				.join(" ");
	}

	/**
	 * Returns true if the execution is happening on a mobile device
	 * @return boolean
	 */
	get isMobile() {
		return navigator.userAgent.match(
			/(Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone)/i);
	}

	/**
	 * Returns true if both dates belong to the same day.
	 * @param {*} date1 
	 * @param {*} date2 
	 * @returns boolean
	 */
	isSameDay(date1, date2) {
		if (date1 != null && date2 != null)
			return date1.getFullYear() == date2.getFullYear() &&
				date1.getMonth() == date2.getMonth() &&
				date1.getDate() == date2.getDate();

		return false;
	}

	/**
	 * Converts the val to the type requested
	 * @param {*} val 
	 * @param {*} type 
	 * @returns 
	 */
	convertToType(val, type) {
		switch (type) {
			case "int":
				return parseInt(val);
			case "float":
				return parseFloat(val);
			case "bool":
				return val?.toLowerCase() == "true";
			default:
				return val;
		}
	}

	/**
	 * Returns the last element of an array. null is returnd
	 * if the list is undefined, null, or empty.
	 * @param {*} list 
	 * @returns 
	 */
	getLastElement(list) {
		return list ? list[list.length - 1] || null : null;
	}

	getDmlErrors(error) {
		return [
			error?.body?.message,
			...(error?.body?.output?.errors?.map(e => e.message) || []),
			...Object.values(error?.body?.output?.fieldErrors || {})
				.map(es => es.map(e => e.message))
		].filter(e => e);
	}

	// NOTE: Private Helper only from thin line on.
	// add public methods before this line.
	// --------------------------------------------
	/**
	 * Private helper to complete the binarySearch
	 * public method. Recursive and uses arrays slices.
	 * @param {*} arr 
	 * @param {*} x 
	 * @param {*} start 
	 * @param {*} end 
	 * @returns 
	 */
	_binarySearch(arr, x, start, end) {
		// base condition
		if (start > end)
			return null;

		// Find the middle index
		let mid = Math.floor((start + end) / 2);

		// Compare mid with given key x
		if (arr[mid] == x)
			return mid;

		// If element at mid is greater than x,
		// search in the left half of mid
		if (arr[mid] > x)
			return this._binarySearch(arr, x, start, mid - 1);
		else
			// If element at mid is smaller than x,
			// search in the right half of mid
			return this._binarySearch(arr, x, mid + 1, end);
	}
}