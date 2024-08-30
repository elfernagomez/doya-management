import LwcBase from "c/lwcBase";
import { track, api, wire } from "lwc";

export default class InputList extends LwcBase {
	@api
	mode = "edit"; // view, edit

	@api
	isRequired = false;

	@api
	label = "Items";

	@api
	get value() {
		return [...this.items];
	}

	set value(n) {
		this.items = [...n] || [];
	};

	@api
	allowDuplicates = false;

	@api
	orderingType = "custom"; // acs, desc, custom

	@track
	items = [];

	newValue;
	isDragging = false;
	isDraggingHandlerUsed = false;
	draggingIndex;

	get isView() {
		return this.mode == "view";
	}

	get isEdit() {
		return this.mode == "edit";
	}

	get isAddBtnDisabled() {
		return this.newValue == null;
	}

	get isDraggingAllowed() {
		return this.isEdit && this.orderingType == "custom";
	}

	get orderingTypeOptions() {
		return [{
			label: "AZ",
			value: "asc",
			iconName: "utility:arrowup",
			isSelected: this.orderingType == "asc"
		}, {
			label: "ZA",
			value: "desc",
			iconName: "utility:arrowdown",
			isSelected: this.orderingType == "desc"
		}, {
			label: "Custom",
			value: "custom",
			iconName: "utility:sort",
			isSelected: this.orderingType == "custom"
		}]
	}

	get isValid() {
		return !this.isRequired || this.items.length > 0;
	}

	@api
	checkValidity() {
		return this.isValid;
	}

	@api
	reportValidity() {
		let cmp = this.getComponent(".newElementInput");
		cmp.setCustomValidity(this.isValid ? "" : "At least one item is required");
		cmp.reportValidity();
	}

	handleSortOptionClick(event) {
		event.stopPropagation();
		this.orderingType = event.target.dataset.value;
		this.processItemsChanged();
	}

	handleOnNewValueChange(event) {
		event.stopPropagation();
		event.target.setCustomValidity("");
		event.target.reportValidity();
		this.newValue = event.target.value?.trim();
	}

	handleOnDeleteItemClick(event) {
		let index = parseInt(event.target.dataset.index);
		this.deleteValue(index);
	}

	handleOnNewValueKeyPress(event) {
		if (event.keyCode == 13 && this.newValue) {
			this.addNewValue(this.newValue);
			this.newValue = null;
		}
	}

	handleOnAddClick() {
		if (this.newValue) {
			this.addNewValue(this.newValue);
			this.newValue = null;
		}
	}

	/*
	Drag/Drop START
	---------------
	*/
	handleOnHandlerMouseDown() {
		this.isDraggingHandlerUsed = true;
	}

	handleOnHandlerMouseUp() {
		this.isDraggingHandlerUsed = false;
	}

	handleOnDragStart(event) {
		// we only want to allow the drag start
		// to happen if the handle was used
		if (this.isDraggingHandlerUsed) {
			this.draggingIndex = event.target.dataset.index;
			this.isDragging = true;
			event.target.classList.add("dragging");
		} else
			event.preventDefault();
	}

	handleOnDragEnd(event) {
		this.draggingIndex = null;
		this.isDragging = false;
		this.isDraggingHandlerUsed = false;
		event.target.classList.remove("dragging");
	}

	handleOnDragOver(event) {
		event.preventDefault();
		event.target.classList.add("dragging-over");
	}

	handleOnDragLeave(event) {
		event.target.classList.remove("dragging-over");
	}

	handleOnDrop(event) {
		let index = event.target.dataset.index;
		let pos = event.target.dataset.position;
		this.moveItem(
			this.draggingIndex,
			pos == "after" ? index + 1 : index);
	}
	/*
	-------------
	Drag/Drop END
	*/

	addNewValue(value) {
		if (this.allowDuplicates || !this.items.includes(value)) {
			this.items.push(value);
			this.processItemsChanged();
		}
	}

	deleteValue(index) {
		this.items.splice(index, 1);
		this.processItemsChanged();
	}

	moveItem(fromIndex, toIndex) {
		// do nothing if indexes are the same
		if (fromIndex != toIndex) {
			// if the fromIndex is less that toIndex,
			// once we remove the item from the fromIndex,
			// the element now in the toIndex will be one index less
			if (fromIndex < toIndex)
				toIndex--;

			let toMove = this.items.splice(fromIndex, 1);
			this.items.splice(toIndex, 0, toMove[0]);
			this.processItemsChanged();
		}
	}

	processItemsChanged() {
		this.sort();
		this.customEvent("change", {
			value: [...this.items]
		});
	}

	sort() {
		switch (this.orderingType) {
			case "asc":
				this.items.sort();
				break;
			case "desc":
				this.items.sort();
				this.items.reverse();
				break;
			case "custom":
			default:
				break;
		}
	}
}