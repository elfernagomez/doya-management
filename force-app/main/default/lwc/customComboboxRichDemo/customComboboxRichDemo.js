import { LightningElement, track } from 'lwc';

export default class CustomComboboxRichDemo extends LightningElement {
	@track selectedCustomer = '';
	@track selectedProduct = '';
	@track selectedStatus = '';
	@track selectedStaff = '';

	// Example 1: Customer options with icons, subtitles, and badges
	customerOptions = [
		{
			label: 'Acme Corporation',
			value: 'ACME001',
			subtitle: 'Enterprise • 5000+ employees',
			iconName: 'standard:account',
			iconAlt: 'Account',
			badge: 'VIP',
			badgeVariant: 'success'
		},
		{
			label: 'TechStart Inc.',
			value: 'TECH002',
			subtitle: 'Startup • Tech Industry',
			iconName: 'standard:account',
			iconAlt: 'Account',
			badge: 'New',
			badgeVariant: 'warning'
		},
		{
			label: 'Global Industries',
			value: 'GLOB003',
			subtitle: 'Manufacturing • 2000 employees',
			iconName: 'standard:account',
			iconAlt: 'Account'
		},
		{
			label: 'Local Supplies Co.',
			value: 'LOCA004',
			subtitle: 'Retail • Small Business',
			iconName: 'standard:account',
			iconAlt: 'Account',
			badge: 'Hot',
			badgeVariant: 'error'
		}
	];

	// Example 2: Product options with custom icons
	productOptions = [
		{
			label: 'Premium Widget Pro',
			value: 'PROD001',
			subtitle: 'SKU: WGT-PRO-001 • In Stock: 150',
			iconName: 'standard:product',
			iconAlt: 'Product',
			badge: 'Best Seller',
			badgeVariant: 'success'
		},
		{
			label: 'Standard Widget',
			value: 'PROD002',
			subtitle: 'SKU: WGT-STD-002 • In Stock: 300',
			iconName: 'standard:product',
			iconAlt: 'Product'
		},
		{
			label: 'Widget Mini',
			value: 'PROD003',
			subtitle: 'SKU: WGT-MIN-003 • Low Stock: 15',
			iconName: 'standard:product',
			iconAlt: 'Product',
			badge: 'Low Stock',
			badgeVariant: 'warning'
		},
		{
			label: 'Widget XL (Discontinued)',
			value: 'PROD004',
			subtitle: 'SKU: WGT-XL-004 • Out of Stock',
			iconName: 'standard:product',
			iconAlt: 'Product',
			badge: 'Discontinued',
			badgeVariant: 'error'
		}
	];

	// Example 3: Status options with utility icons
	statusOptions = [
		{
			label: 'Draft',
			value: 'draft',
			subtitle: 'Order is being prepared',
			iconName: 'utility:edit',
			iconAlt: 'Draft'
		},
		{
			label: 'Pending Approval',
			value: 'pending',
			subtitle: 'Waiting for manager approval',
			iconName: 'utility:clock',
			iconAlt: 'Pending',
			badge: 'Action Required',
			badgeVariant: 'warning'
		},
		{
			label: 'Approved',
			value: 'approved',
			subtitle: 'Ready for processing',
			iconName: 'utility:check',
			iconAlt: 'Approved',
			badge: 'Active',
			badgeVariant: 'success'
		},
		{
			label: 'In Progress',
			value: 'in_progress',
			subtitle: 'Currently being fulfilled',
			iconName: 'utility:spinner',
			iconAlt: 'In Progress'
		},
		{
			label: 'Completed',
			value: 'completed',
			subtitle: 'Order has been fulfilled',
			iconName: 'utility:success',
			iconAlt: 'Completed',
			badge: 'Done',
			badgeVariant: 'success'
		},
		{
			label: 'Cancelled',
			value: 'cancelled',
			subtitle: 'Order was cancelled',
			iconName: 'utility:close',
			iconAlt: 'Cancelled',
			badge: 'Cancelled',
			badgeVariant: 'error'
		}
	];

	// Example 4: Staff options with user icons
	staffOptions = [
		{
			label: 'Sarah Johnson',
			value: 'USER001',
			subtitle: 'Senior Manager • Available',
			iconName: 'standard:user',
			iconAlt: 'User',
			badge: 'Available',
			badgeVariant: 'success'
		},
		{
			label: 'Michael Chen',
			value: 'USER002',
			subtitle: 'Technician • Busy on another order',
			iconName: 'standard:user',
			iconAlt: 'User',
			badge: 'Busy',
			badgeVariant: 'warning'
		},
		{
			label: 'Emily Rodriguez',
			value: 'USER003',
			subtitle: 'Quality Control • On Leave',
			iconName: 'standard:user',
			iconAlt: 'User',
			badge: 'On Leave',
			badgeVariant: 'error'
		},
		{
			label: 'James Wilson',
			value: 'USER004',
			subtitle: 'Production Lead • Available',
			iconName: 'standard:user',
			iconAlt: 'User',
			badge: 'Available',
			badgeVariant: 'success'
		}
	];

	// Event handlers
	handleCustomerChange(event) {
		this.selectedCustomer = event.detail.value;
		console.log('Selected Customer:', event.detail.option);
	}

	handleProductChange(event) {
		this.selectedProduct = event.detail.value;
		console.log('Selected Product:', event.detail.option);
	}

	handleStatusChange(event) {
		this.selectedStatus = event.detail.value;
		console.log('Selected Status:', event.detail.option);
	}

	handleStaffChange(event) {
		this.selectedStaff = event.detail.value;
		console.log('Selected Staff:', event.detail.option);
	}
}
