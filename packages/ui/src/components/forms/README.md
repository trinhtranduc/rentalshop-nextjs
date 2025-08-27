# Order Form Components

## Overview

This directory contains reusable form components for order management. The main component is `CreateOrderForm` which can be used for both creating new orders and editing existing ones.

## CreateOrderForm

A comprehensive, reusable form component that handles both order creation and editing.

### Features

- **Dual Mode**: Automatically switches between create and edit modes
- **Form Validation**: Comprehensive validation for all order fields
- **Product Management**: Add/remove products, manage quantities and prices
- **Customer Selection**: Search and select existing customers or add new ones
- **Rental Support**: Handles both rental and sale orders with date selection
- **Real-time Calculations**: Automatic subtotal, discount, and total calculations
- **Responsive Design**: Works on all screen sizes

### Props

```typescript
interface CreateOrderFormProps {
  // Data props
  customers?: CustomerSearchResult[];
  products?: ProductWithStock[];
  outlets?: Array<{ id: number; name: string }>;
  categories?: Array<{ id: number; name: string }>;
  
  // Event handlers
  onSubmit?: (data: OrderInput) => void;
  onCancel?: () => void;
  
  // UI props
  loading?: boolean;
  layout?: 'stacked' | 'split';
  
  // Business props
  merchantId?: number;
  
  // Edit mode props
  isEditMode?: boolean;
  initialOrder?: any; // Order data for editing
  orderNumber?: string; // Order number for display in edit mode
}
```

### Usage Examples

#### 1. Create Mode (Default)

```tsx
import { CreateOrderForm } from '@rentalshop/ui';

export default function CreateOrderPage() {
  const handleCreateOrder = async (orderData: OrderInput) => {
    try {
      const response = await createOrder(orderData);
      if (response.success) {
        // Handle success
        router.push('/orders');
      }
    } catch (error) {
      // Handle error
    }
  };

  return (
    <CreateOrderForm
      customers={customers}
      products={products}
      outlets={outlets}
      onSubmit={handleCreateOrder}
      onCancel={() => router.back()}
      merchantId={merchantId}
    />
  );
}
```

#### 2. Edit Mode

```tsx
import { CreateOrderForm } from '@rentalshop/ui';

export default function EditOrderPage({ order }: { order: OrderDetailData }) {
  const handleUpdateOrder = async (orderData: OrderInput) => {
    try {
      const response = await updateOrder(orderData.id!, orderData);
      if (response.success) {
        // Handle success
        router.push('/orders');
      }
    } catch (error) {
      // Handle error
    }
  };

  return (
    <CreateOrderForm
      isEditMode={true}
      initialOrder={order}
      orderNumber={order.orderNumber}
      customers={customers}
      products={products}
      outlets={outlets}
      onSubmit={handleUpdateOrder}
      onCancel={() => router.back()}
      merchantId={merchantId}
    />
  );
}
```

### EditOrderForm (Legacy Wrapper)

For backward compatibility, there's also an `EditOrderForm` component that simply wraps `CreateOrderForm` in edit mode:

```tsx
import { EditOrderForm } from '@rentalshop/ui';

// This is equivalent to using CreateOrderForm with isEditMode={true}
<EditOrderForm
  order={existingOrder}
  customers={customers}
  products={products}
  outlets={outlets}
  onSubmit={handleUpdateOrder}
  onCancel={handleCancel}
/>
```

## Benefits of This Approach

1. **DRY Principle**: No duplicate code between create and edit forms
2. **Consistency**: Same UI, validation, and behavior for both modes
3. **Maintainability**: Single source of truth for order form logic
4. **Flexibility**: Easy to switch between modes or add new features
5. **Testing**: Test once, works for both use cases

## Form States

### Create Mode
- Empty form with default values
- "Preview" button for order confirmation
- "Reset Selection" button to clear form

### Edit Mode
- Pre-populated with existing order data
- "Update Order" button for saving changes
- "Cancel" button to discard changes
- Header showing order number and edit mode indicator

## Validation Rules

- **Products**: At least one product required
- **Customer**: Customer information required (ID, name, or phone)
- **Rental Orders**: Pickup and return dates required
- **Deposit**: Minimum deposit amount for rental orders
- **Dates**: Rental period must be within business limits

## Business Logic

- **Order Types**: Supports RENT and SALE orders
- **Pricing**: Automatic calculation of totals, discounts, and deposits
- **Availability**: Real-time product availability checking
- **Customer Management**: Search existing customers or create new ones
- **Product Management**: Add/remove products, adjust quantities and prices
