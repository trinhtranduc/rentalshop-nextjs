# Customers Feature Components

This directory contains the customer management functionality for the rental shop application.

## Components

### Customers (Main Component)
The main `Customers` component that orchestrates all customer-related functionality.

**Props:**
- `data: CustomerData` - Customer data including list, pagination, and stats
- `filters: CustomerFilters` - Search and filter options
- `merchantId: string` - ID of the current merchant
- `onCustomerAction: (action: string, customerId?: string) => void` - Handler for customer actions
- `onCustomerCreated?: (customer: CustomerWithMerchant) => void` - Callback when customer is created
- `onCustomerUpdated?: (customer: CustomerWithMerchant) => void` - Callback when customer is updated
- `onError?: (error: string) => void` - Error handler callback

### CustomerActions
Provides action buttons for customer management including Add Customer, Import/Export, etc.

**Features:**
- Add new customer (opens dialog)
- Import customers from CSV/Excel
- Export customers to CSV/Excel
- Bulk actions
- Customer segments
- Loyalty program management

### CustomerFormDialog
Modal dialog for adding and editing customers.

**Features:**
- Create new customer
- Edit existing customer
- Form validation
- API integration
- Success/error handling

## Usage Example

```tsx
import { Customers } from '@rentalshop/ui';

function CustomerManagementPage() {
  const [customerData, setCustomerData] = useState<CustomerData>({
    customers: [],
    total: 0,
    currentPage: 1,
    totalPages: 1,
    limit: 20,
    stats: { /* ... */ }
  });

  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    status: '',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const handleCustomerAction = (action: string, customerId?: string) => {
    switch (action) {
      case 'add-customer':
        // Handled by CustomerActions component
        break;
      case 'edit-customer':
        // Handle edit action
        break;
      // ... other actions
    }
  };

  const handleCustomerCreated = (customer: CustomerWithMerchant) => {
    // Refresh customer list or add to current list
    setCustomerData(prev => ({
      ...prev,
      customers: [customer, ...prev.customers],
      total: prev.total + 1
    }));
  };

  const handleCustomerUpdated = (customer: CustomerWithMerchant) => {
    // Update customer in current list
    setCustomerData(prev => ({
      ...prev,
      customers: prev.customers.map(c => 
        c.id === customer.id ? customer : c
      )
    }));
  };

  return (
    <Customers
      data={customerData}
      filters={filters}
      onFiltersChange={setFilters}
      onSearchChange={(search) => setFilters(prev => ({ ...prev, search }))}
      onCustomerAction={handleCustomerAction}
      onPageChange={(page) => setFilters(prev => ({ ...prev, currentPage: page }))}
      merchantId="merchant-123"
      onCustomerCreated={handleCustomerCreated}
      onCustomerUpdated={handleCustomerUpdated}
      onError={(error) => console.error('Customer error:', error)}
    />
  );
}
```

## API Integration

The components integrate with the following API endpoints:

- `POST /api/customers` - Create new customer
- `PUT /api/customers?customerId={id}` - Update existing customer
- `GET /api/customers` - List customers with filters
- `GET /api/customers/{id}` - Get customer details

## Form Fields

The customer form includes:

**Personal Information:**
- First Name (required)
- Last Name (required)
- Email (required)
- Phone (required)
- Date of Birth
- ID Type (passport, driver's license, national ID, other)
- ID Number

**Address Information:**
- Street Address
- City
- State/Province
- ZIP/Postal Code
- Country

**Additional Information:**
- Notes

## Validation

- Required fields: firstName, lastName, email, phone, merchantId
- Email format validation
- Phone number validation
- Form submission disabled until validation passes

## Error Handling

- API error messages displayed to user
- Form validation errors shown inline
- Success messages with auto-dismiss
- Loading states during API calls
