# Image Search Dialog - Usage Guide

## ✨ Features

ImageSearchDialog hiện đã có đầy đủ actions cho products:

1. ✅ **Hiển thị danh sách products** với similarity scores
2. ✅ **Add to Cart** - Thêm vào giỏ hàng
3. ✅ **View Product** - Xem chi tiết sản phẩm
4. ✅ **Edit Product** - Chỉnh sửa sản phẩm

## 📦 Component Props

```typescript
interface ImageSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchResult: (products: Product[]) => void;
  onAddToCart?: (product: Product) => void;      // NEW ✨
  onViewProduct?: (product: Product) => void;    // NEW ✨
  onEditProduct?: (product: Product) => void;    // NEW ✨
  categoryId?: number;
}
```

## 🎯 Usage Examples

### Basic Usage (Search Only)

```tsx
import { ImageSearchDialog } from '@rentalshop/ui';

function ProductsPage() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsSearchOpen(true)}>
        Search by Image
      </Button>

      <ImageSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onSearchResult={(products) => {
          console.log('Found products:', products);
        }}
      />
    </>
  );
}
```

### Full Features with Actions

```tsx
import { ImageSearchDialog } from '@rentalshop/ui';
import { useRouter } from 'next/navigation';

function ProductsPage() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const router = useRouter();

  const handleAddToCart = (product: Product) => {
    // Add to cart logic
    console.log('Adding to cart:', product);
    // You can call your cart API here
    addToCart(product);
    toast.success(`Added ${product.name} to cart`);
  };

  const handleViewProduct = (product: Product) => {
    // Navigate to product detail page
    router.push(`/products/${product.id}`);
    setIsSearchOpen(false);
  };

  const handleEditProduct = (product: Product) => {
    // Navigate to product edit page
    router.push(`/products/${product.id}/edit`);
    setIsSearchOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsSearchOpen(true)}>
        <Image className="w-4 h-4 mr-2" />
        Search by Image
      </Button>

      <ImageSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onSearchResult={(products) => {
          console.log('Found:', products.length, 'products');
        }}
        onAddToCart={handleAddToCart}
        onViewProduct={handleViewProduct}
        onEditProduct={handleEditProduct}
      />
    </>
  );
}
```

### With Category Filter

```tsx
<ImageSearchDialog
  open={isSearchOpen}
  onOpenChange={setIsSearchOpen}
  onSearchResult={(products) => {
    console.log('Found products in category:', categoryId);
  }}
  onAddToCart={handleAddToCart}
  onViewProduct={handleViewProduct}
  categoryId={28}  // Filter by category
/>
```

### In Order Creation Page

```tsx
function CreateOrderPage() {
  const [isImageSearchOpen, setIsImageSearchOpen] = useState(false);
  const [orderItems, setOrderItems] = useState<Product[]>([]);

  const handleAddToOrder = (product: Product) => {
    // Add product to order items
    setOrderItems(prev => [...prev, product]);
    toast.success(`Added ${product.name} to order`);
  };

  return (
    <div>
      {/* Order form */}
      <h2>Create Order</h2>
      
      {/* Search by image button */}
      <Button onClick={() => setIsImageSearchOpen(true)}>
        <Camera className="w-4 h-4 mr-2" />
        Find Product by Image
      </Button>

      {/* Image search dialog */}
      <ImageSearchDialog
        open={isImageSearchOpen}
        onOpenChange={setIsImageSearchOpen}
        onSearchResult={(products) => {
          console.log('Search results:', products);
        }}
        onAddToCart={handleAddToOrder}  // Add to order instead of cart
        onViewProduct={(product) => {
          // Quick view in modal
          setSelectedProduct(product);
          setIsQuickViewOpen(true);
        }}
      />

      {/* Order items list */}
      <div>
        {orderItems.map(item => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    </div>
  );
}
```

## 🎨 UI Layout

### Product Card Layout

```
┌─────────────────────────────────────────────┐
│  ┌────────┐  Product Name                   │
│  │        │  Barcode: 123456                │
│  │ Image  │  500,000 VND                    │
│  │  85%   │  Description...                 │
│  │        │                                  │
│  └────────┘  [Add to Cart] [👁] [✏]        │
└─────────────────────────────────────────────┘
```

- **Image**: 128x128px with similarity badge
- **Info**: Product name, barcode, price, description
- **Actions**: 
  - Primary button: Add to Cart (full width)
  - Secondary buttons: View (eye icon), Edit (pencil icon)

### Dialog Size

- **Width**: `max-w-6xl` (increased from 4xl for better product display)
- **Height**: `max-h-[90vh]` with scroll
- **Grid**: 2 columns on desktop (better than 3 for detailed cards)

## 📊 Features

### 1. Upload & Search

```tsx
// Upload image via file input or drag & drop
<input type="file" accept="image/*" />

// Preview selected image
<img src={previewUrl} alt="Preview" />

// Search button
<Button onClick={handleSearch}>
  <Search /> Search
</Button>
```

### 2. Display Results

```tsx
// Results grid (2 columns)
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {searchResults.map(product => (
    <ProductCard
      product={product}
      similarity={product.similarity}
    />
  ))}
</div>
```

### 3. Product Actions

```tsx
// Each product card has:
<div className="flex gap-2">
  <Button onClick={() => onAddToCart(product)}>
    <ShoppingCart /> Add to Cart
  </Button>
  <Button onClick={() => onViewProduct(product)}>
    <Eye />
  </Button>
  <Button onClick={() => onEditProduct(product)}>
    <Edit />
  </Button>
</div>
```

## 🔒 Permissions

Actions are **optional** - only render if callback provided:

```tsx
{onAddToCart && (
  <Button onClick={() => onAddToCart(product)}>
    Add to Cart
  </Button>
)}
```

This allows different roles to see different actions:
- **OUTLET_STAFF**: Only view
- **OUTLET_ADMIN**: View + Edit
- **ADMIN**: All actions

## 🎯 Use Cases

### 1. Product Management
```tsx
<ImageSearchDialog
  onViewProduct={viewProduct}
  onEditProduct={editProduct}
  // No onAddToCart - just for browsing
/>
```

### 2. Order Creation
```tsx
<ImageSearchDialog
  onAddToCart={addToOrder}  // Add to order
  onViewProduct={quickView}  // Quick view details
  // No onEditProduct - focus on adding to order
/>
```

### 3. Customer Service
```tsx
<ImageSearchDialog
  onViewProduct={showDetails}  // Show to customer
  onAddToCart={addToCart}      // Add to cart for customer
  // No onEditProduct - customer-facing
/>
```

## 📱 Responsive Design

- **Mobile**: 1 column, stacked layout
- **Tablet**: 1-2 columns
- **Desktop**: 2 columns for detailed cards

## 🎨 Styling

```tsx
// Card hover effect
className="hover:shadow-md transition-shadow"

// Primary action button
<Button variant="default" className="flex-1">
  Add to Cart
</Button>

// Secondary action buttons
<Button variant="outline" size="sm">
  <Eye />
</Button>
```

## 🚀 Performance

- **Lazy loading**: Images load on demand
- **Error handling**: Fallback placeholder for missing images
- **Cleanup**: URL.revokeObjectURL for preview images
- **Limit**: 20 results max

## 🔍 Search Parameters

```typescript
{
  limit: 20,              // Max 20 results
  minSimilarity: 0.5,     // 50% similarity threshold
  categoryId?: number     // Optional category filter
}
```

## 📝 Notes

1. **Image formats**: JPG, PNG, WebP
2. **Max size**: 10MB (will be compressed to ~100KB)
3. **Search time**: ~1-2 seconds typical
4. **Similarity scores**: 70%+ = very similar, 50-70% = similar
5. **Role-based filtering**: Automatic based on user's merchantId

## 🎯 Example: Complete Integration

```tsx
'use client';

import { useState } from 'react';
import { ImageSearchDialog } from '@rentalshop/ui';
import { useRouter } from 'next/navigation';
import { useToast } from '@rentalshop/ui';
import type { Product } from '@rentalshop/types';

export function ProductsPageWithImageSearch() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const router = useRouter();
  const { toastSuccess } = useToast();

  return (
    <div>
      {/* Trigger button */}
      <Button
        onClick={() => setIsSearchOpen(true)}
        variant="outline"
      >
        <Camera className="w-4 h-4 mr-2" />
        Search by Image
      </Button>

      {/* Image search dialog */}
      <ImageSearchDialog
        open={isSearchOpen}
        onOpenChange={setIsSearchOpen}
        onSearchResult={(products) => {
          console.log(`Found ${products.length} similar products`);
        }}
        onAddToCart={(product) => {
          // Add to cart
          addToCart(product);
          toastSuccess('Added to cart', `${product.name} added successfully`);
        }}
        onViewProduct={(product) => {
          // Navigate to detail page
          router.push(`/products/${product.id}`);
          setIsSearchOpen(false);
        }}
        onEditProduct={(product) => {
          // Navigate to edit page
          router.push(`/products/${product.id}/edit`);
          setIsSearchOpen(false);
        }}
      />
    </div>
  );
}
```

---

**Updated:** 2026-01-29
**Version:** 2.0 (with actions support)
