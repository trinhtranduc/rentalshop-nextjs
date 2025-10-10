# Products Components

This directory contains all the components needed for the Products feature in the rental shop application.

## Components Overview

### Core Components
- **Products** - Main products listing component with grid/table views
- **ProductDetail** - Product detail view with vertical card-based layout
- **ProductDetailHorizontal** - Alternative product detail view with horizontal two-column layout
- **ProductDetailLayoutDemo** - Demo component showing both layout options side by side

### Form Components
- **ProductAddForm** - Form for adding new products
- **ProductEditForm** - Form for editing existing products
- **ProductFormDialog** - Dialog wrapper for product forms

### Display Components
- **ProductGrid** - Grid view of products
- **ProductTable** - Table view of products
- **ProductCard** - Individual product card component
- **ProductActions** - Product action buttons and menus

### Utility Components
- **ProductHeader** - Header with view mode toggle and actions
- **ProductFilters** - Search and filter controls
- **ProductPagination** - Pagination controls
- **ProductsLoading** - Loading states for products

## Layout Options

### 1. Vertical Layout (ProductDetail)
The traditional card-based layout that stacks all sections vertically:

```tsx
import { ProductDetail } from '@rentalshop/ui';

<ProductDetail
  product={product}
  onEdit={handleEdit}
  onViewOrders={handleViewOrders}
  showActions={true}
  isMerchantAccount={true}
/>
```

**Features:**
- ✅ Full-width sections for better mobile experience
- ✅ Clear visual separation between information types
- ✅ Good for focusing on one section at a time
- ✅ Traditional, familiar layout pattern

### 2. Horizontal Layout (ProductDetailHorizontal)
A modern two-column grid layout that makes better use of wide screens:

```tsx
import { ProductDetailHorizontal } from '@rentalshop/ui';

<ProductDetailHorizontal
  product={product}
  onEdit={handleEdit}
  onViewOrders={handleViewOrders}
  showActions={true}
  isMerchantAccount={true}
/>
```

**Features:**
- ✅ Two-column layout for better space utilization
- ✅ More compact view showing more information at once
- ✅ Better for desktop and wide screens
- ✅ Modern, efficient layout pattern

### 3. Layout Comparison Demo
Use the demo component to compare both layouts side by side:

```tsx
import { ProductDetailLayoutDemo } from '@rentalshop/ui';

<ProductDetailLayoutDemo
  product={product}
  onEdit={handleEdit}
  onViewOrders={handleViewOrders}
  showActions={true}
  isMerchantAccount={true}
/>
```

## When to Use Each Layout

### Use Vertical Layout When:
- Mobile-first design is priority
- Users need to focus on one section at a time
- Screen space is limited
- You want a traditional, familiar interface

### Use Horizontal Layout When:
- Desktop/tablet experience is priority
- Users need to see more information at once
- Screen space is abundant
- You want a modern, efficient interface

## Implementation Example

```tsx
import React, { useState } from 'react';
import { 
  ProductDetail, 
  ProductDetailHorizontal,
  ProductDetailLayoutDemo 
} from '@rentalshop/ui';

function ProductPage({ product }) {
  const [layout, setLayout] = useState<'vertical' | 'horizontal'>('vertical');
  
  const handleEdit = () => {
    // Handle edit action
  };
  
  const handleViewOrders = () => {
    // Handle view orders action
  };

  return (
    <div>
      {/* Layout Toggle */}
      <div className="mb-4">
        <button 
          onClick={() => setLayout('vertical')}
          className={layout === 'vertical' ? 'active' : ''}
        >
          Vertical Layout
        </button>
        <button 
          onClick={() => setLayout('horizontal')}
          className={layout === 'horizontal' ? 'active' : ''}
        >
          Horizontal Layout
        </button>
      </div>

      {/* Render Selected Layout */}
      {layout === 'vertical' ? (
        <ProductDetail
          product={product}
          onEdit={handleEdit}
          onViewOrders={handleViewOrders}
          showActions={true}
          isMerchantAccount={true}
        />
      ) : (
        <ProductDetailHorizontal
          product={product}
          onEdit={handleEdit}
          onViewOrders={handleViewOrders}
          showActions={true}
          isMerchantAccount={true}
        />
      )}
    </div>
  );
}
```

## Props

Both `ProductDetail` and `ProductDetailHorizontal` accept the same props:

- **product** (required): The product data to display
- **onEdit** (optional): Callback function for edit action
- **onViewOrders** (optional): Callback function for viewing orders
- **showActions** (optional): Whether to show action buttons (default: true)
- **isMerchantAccount** (optional): Whether user has merchant access (default: false)

## Styling

Both components use the shared UI components from `@rentalshop/ui` and follow the same design system:
- Consistent card layouts
- Proper spacing and typography
- Responsive design patterns
- Accessible color schemes
- Icon consistency with Lucide React

## Accessibility

Both layouts include:
- Proper semantic HTML structure
- ARIA labels and descriptions
- Keyboard navigation support
- Screen reader compatibility
- High contrast ratios
- Focus indicators
