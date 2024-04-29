
## Specs

- Orders must contain a summary of the work order status.
- Inner work orders lit view must contain visibility of Procedures. For this, a lookup to Procedure (Work type) must be created in SOP Line Item and Wor Order Line Item.

### Steps constrains

- Procedure (Lookup to work type): Lamination, Print, they require extra information. Add an extra field in the Procedure object. Admin will enter multiple value separated by an end of line character. Show this values as a picklist if the Procedure is selected.
- Allow the creatino of SOP from a work order step list.