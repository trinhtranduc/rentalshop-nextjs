# CompactListLayout Component

## Overview

The `CompactListLayout` component provides a compact, interactive list view for managing selected products in rental orders. It features inline editing, real-time calculations, and a responsive design optimized for both desktop and mobile use.

## Key Features

- **Compact List Layout**: Efficient space usage with all product information visible
- **Inline Editing**: Modify prices and quantities without opening dialogs
- **Real-time Calculations**: Automatic total updates as you make changes
- **Search Functionality**: Filter through selected products quickly
- **Responsive Design**: Works seamlessly on all device sizes
- **Built-in Sample Data**: Comes with realistic Vietnamese product examples
- **Vietnamese Currency**: Proper VND formatting for rental business

## Usage

### Basic Implementation

```tsx
import CompactListLayout from '@rentalshop/ui';

function OrderPage() {
  return <CompactListLayout />;
}
```

### Integration in Order Forms

```tsx
import CompactListLayout from '@rentalshop/ui';

function OrderForm() {
  return (
    <div>
      <h1>Create Order</h1>
      <CompactListLayout />
    </div>
  );
}
```

## Component Structure

The component is self-contained and includes:

- **Sample Data**: 5 realistic Vietnamese rental products
- **State Management**: Internal state for products, search, and calculations
- **Search Functionality**: Filter products by name
- **Inline Controls**: Quantity +/- buttons, price inputs, delete actions
- **Real-time Totals**: Automatic calculation of grand total

## Product Interface

```tsx
interface Product {
  id: string;
  name: string;
  color: string;
  unitPrice: number;
  deposit: number;
  quantity: number;
}
```

## Sample Products Included

The component comes with realistic sample data:

1. **Ghế nhựa cao cấp** (White) - 15,000 VND + 50,000 VND deposit
2. **Bàn tròn 10 người** (Wood Brown) - 80,000 VND + 200,000 VND deposit
3. **Âm thanh di động** (Black) - 120,000 VND + 300,000 VND deposit
4. **Khăn trải bàn** (Red) - 25,000 VND + 30,000 VND deposit
5. **Đèn LED trang trí** (Yellow) - 45,000 VND + 80,000 VND deposit

## Integration Examples

### 1. Order Creation Form

The `OrderWithSelectedProducts` component demonstrates a complete order creation workflow:

```tsx
import { OrderWithSelectedProducts } from '@rentalshop/ui';

function CreateOrderPage() {
  return <OrderWithSelectedProducts />;
}
```

### 2. Standalone Product Management

```tsx
import CompactListLayout from '@rentalshop/ui';

function ProductManagementPage() {
  return (
    <div>
      <h1>Product Management</h1>
      <CompactListLayout />
    </div>
  );
}
```



## Styling

The component uses Tailwind CSS classes and follows the design system. Key styling features:

- **Hover Effects**: Subtle shadows on product cards
- **Color Coding**: Blue accents for totals and actions
- **Responsive Grid**: Adapts to different screen sizes
- **Consistent Spacing**: Uses the design system's spacing scale
- **Vietnamese Text**: Proper Vietnamese language support

## Performance Considerations

- **Efficient Rendering**: Only re-renders when necessary
- **Optimized Calculations**: Totals computed efficiently
- **Memory Management**: Proper cleanup of event handlers
- **Built-in State**: No external state management required

## Accessibility

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Focus Management**: Clear focus indicators
- **Color Contrast**: Meets WCAG accessibility guidelines

## Best Practices

1. **Direct Usage**: Use the component directly without additional configuration
2. **Integration**: Embed in forms, dialogs, or standalone pages
3. **Customization**: Modify the component source for specific needs
4. **Mobile First**: The component is designed mobile-first, test on various screen sizes

## Troubleshooting

### Common Issues

1. **Component not rendering**: Check that the import path is correct
2. **Styling conflicts**: Ensure Tailwind CSS is properly configured
3. **Missing icons**: Verify that lucide-react is installed

### Debug Mode

The component includes console logging for debugging:

```tsx
// Check browser console for:
// - Product updates
// - Quantity changes
// - Price modifications
// - Product deletions
```

## Future Enhancements

- **External State Integration**: Allow external state management
- **Custom Product Data**: Accept custom product arrays
- **Event Callbacks**: Provide callback functions for external handling
- **Configuration Props**: Add props for customization
- **Theming Support**: Allow custom color schemes

## Component Location

The component is located in:
```
packages/ui/src/components/features/SelectedProductsLayout.tsx
```

And exported as:
```tsx
export default function CompactListLayout()
```

## Usage in Your Apps

### Client App
```tsx
// apps/client/app/orders/create/page.tsx
import CompactListLayout from '@rentalshop/ui';

export default function CreateOrderPage() {
  return <CompactListLayout />;
}
```

### Admin App
```tsx
// apps/admin/app/orders/create/page.tsx
import CompactListLayout from '@rentalshop/ui';

export default function AdminCreateOrderPage() {
  return <CompactListLayout />;
}
```

This component provides a complete, ready-to-use solution for managing selected products in rental orders with a clean, compact design that's perfect for business applications.
