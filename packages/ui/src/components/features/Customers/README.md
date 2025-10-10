# Customer Components

This directory contains the essential customer management components for the rental shop application. Redundant components have been removed to maintain a clean, maintainable codebase.

## 🗂️ Component Structure

### Core Customer Components
- **`CustomerInfoCard.tsx`** - Main customer information display with actions
- **`CustomerTable.tsx`** - Customer listing table with sorting and actions
- **`CustomerDetailDialog.tsx`** - Detailed customer view dialog

### Customer Forms
- **`AddCustomerForm.tsx`** - Form to create new customers
- **`EditCustomerForm.tsx`** - Form to edit existing customers

### Customer Actions & Navigation
- **`CustomerActions.tsx`** - Action buttons for customer operations
- **`CustomerHeader.tsx`** - Customer statistics and metrics display
- **`CustomerSearch.tsx`** - Search and filter functionality
- **`CustomerPagination.tsx`** - Pagination controls for customer lists

### Customer Data & Utilities
- **`CustomerStats.tsx`** - Customer statistics calculations
- **`CustomerOrdersDialog.tsx`** - Customer orders view dialog
- **`CustomersLoading.tsx`** - Loading states and skeletons

## 🧹 Cleanup Summary

### Removed Redundant Components
- ❌ `CustomerInfoExample.tsx` - Example component (not needed in production)
- ❌ `CustomerInfoUsage.tsx` - Another example component
- ❌ `CustomerReadOnlyInfo.tsx` - Functionality covered by CustomerInfoCard
- ❌ `CustomerManagementCard.tsx` - Functionality covered by CustomerInfoCard
- ❌ `CustomerPageHeader.tsx` - Duplicated CustomerHeader functionality
- ❌ `CustomerFormDialog.tsx` - Redundant with AddCustomerForm/EditCustomerForm

### Benefits of Cleanup
- ✅ **Reduced confusion** - Clear component hierarchy
- ✅ **Easier maintenance** - Fewer files to maintain
- ✅ **Better performance** - Smaller bundle size
- ✅ **Consistent patterns** - Standardized component structure
- ✅ **DRY principle** - No duplicate functionality

## 📱 Component Usage

### CustomerInfoCard (Main Display Component)
```tsx
<CustomerInfoCard
  customer={customerData}
  onEdit={() => handleEdit(customer.id)}
  onViewOrders={() => handleViewOrders(customer.id)}
  onDelete={() => handleDelete(customer.id)}
  showActions={true}
  isLoading={false}
/>
```

### CustomerTable (Listing Component)
```tsx
<CustomerTable
  customers={customers}
  onCustomerAction={handleCustomerAction}
  onViewOrders={handleViewOrders}
  onDeleteCustomer={handleDeleteCustomer}
/>
```

### CustomerDetailDialog (Detail View)
```tsx
<CustomerDetailDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  customer={customerData}
/>
```

## 🎯 Key Features

- **Required Fields Only** - First name and last name are required
- **Optional Fields** - Email, phone, address, and other details are optional
- **Smart Validation** - Validates format only when optional fields are provided
- **Action Buttons** - Edit, View Orders, Delete (positioned at top right)
- **Loading States** - Proper handling of undefined/null customer data
- **Responsive Design** - Works on mobile and desktop
- **Type Safety** - Supports both local and database customer types
- **Consistent Styling** - Follows design system patterns

## 🔧 Maintenance Notes

- All components use the centralized `@rentalshop/ui` imports
- Components handle both `Customer` and `CustomerWithMerchant` types
- Proper null/undefined checks prevent runtime errors
- Loading states provide better user experience
- Action handlers are optional and properly typed
