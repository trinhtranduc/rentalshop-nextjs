# API Client Functions

This directory contains all the API client functions for the rental shop application. These functions provide a clean, type-safe interface for making authenticated API calls.

## Available API Clients

### 1. **Orders API** (`orders.ts`)
```typescript
import { ordersApi } from '@rentalshop/utils';

// Get orders with filters
const orders = await ordersApi.getOrders({ 
  status: ['ACTIVE', 'PENDING'], 
  limit: 20 
});

// Get order by ID
const order = await ordersApi.getOrderById('order-id');

// Get order by order number (e.g., "ORD-2110")
const order = await ordersApi.getOrderByNumber('ORD-2110');

// Get order details with full information
const orderDetails = await ordersApi.getOrderDetails('order-id');

// Create new order
const newOrder = await ordersApi.createOrder(orderData);

// Update existing order
const updatedOrder = await ordersApi.updateOrder('order-id', updateData);

// Delete order
await ordersApi.deleteOrder('order-id');

// Get calendar orders
const calendarOrders = await ordersApi.getCalendarOrders({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  status: ['ACTIVE', 'PENDING']
});
```

### 2. **Customers API** (`customers.ts`)
```typescript
import { customersApi } from '@rentalshop/utils';

// Get customers with filters
const customers = await customersApi.getCustomers({ 
  merchantId: 'merchant-123',
  search: 'John',
  limit: 100 
});

// Get customer by ID
const customer = await customersApi.getCustomerById('customer-id');

// Get customer by phone
const customer = await customersApi.getCustomerByPhone('+1234567890');

// Get customer by email
const customer = await customersApi.getCustomerByEmail('john@example.com');

// Get customer by public ID
const customer = await customersApi.getCustomerByPublicId('123');

// Create new customer
const newCustomer = await customersApi.createCustomer(customerData);

// Update customer
const updatedCustomer = await customersApi.updateCustomer('customer-id', updateData);

// Delete customer
await customersApi.deleteCustomer('customer-id');
```

### 3. **Products API** (`products.ts`)
```typescript
import { productsApi } from '@rentalshop/utils';

// Get products with filters
const products = await productsApi.getProducts({ 
  merchantId: 'merchant-123',
  categoryId: 'category-123',
  available: true,
  limit: 100 
});

// Get product by ID
const product = await productsApi.getProductById('product-id');

// Get product by public ID (requires merchantId for security)
const product = await productsApi.getProductByPublicId(123, merchantId);

// Get product by barcode (requires merchantId for security)
const product = await productsApi.getProductByBarcode('123456789', merchantId);

// Check product availability
const availability = await productsApi.checkAvailability('product-id');

// Create new product
const newProduct = await productsApi.createProduct(productData);

// Update product
const updatedProduct = await productsApi.updateProduct('product-id', updateData);

// Delete product
await productsApi.deleteProduct('product-id');
```

### 4. **Outlets API** (`outlets.ts`)
```typescript
import { outletsApi } from '@rentalshop/utils';

// Get outlets with filters
const outlets = await outletsApi.getOutlets({ 
  merchantId: 'merchant-123',
  isActive: true 
});

// Get outlet by ID
const outlet = await outletsApi.getOutletById('outlet-id');

// Create new outlet
const newOutlet = await outletsApi.createOutlet(outletData);

// Update outlet
const updatedOutlet = await outletsApi.updateOutlet('outlet-id', updateData);

// Delete outlet
await outletsApi.deleteOutlet('outlet-id');
```

### 5. **Categories API** (`categories.ts`)
```typescript
import { categoriesApi } from '@rentalshop/utils';

// Get categories with filters
const categories = await categoriesApi.getCategories({ 
  merchantId: 'merchant-123',
  isActive: true 
});

// Get category by ID
const category = await categoriesApi.getCategoryById('category-id');

// Get categories by parent ID
const subCategories = await categoriesApi.getCategoriesByParent('parent-id');

// Get root categories
const rootCategories = await categoriesApi.getRootCategories();

// Create new category
const newCategory = await categoriesApi.createCategory(categoryData);

// Update category
const updatedCategory = await categoriesApi.updateCategory('category-id', updateData);

// Delete category
await categoriesApi.deleteCategory('category-id');
```

## Usage in Edit Order Page

The edit order page now uses these API functions instead of direct `authenticatedFetch` calls:

```typescript
// Before: Direct API calls
const response = await authenticatedFetch(`/api/orders/by-number/ORD-${numericOrderNumber}`);
const result = await response.json();

// After: Clean API functions
const result = await ordersApi.getOrderByNumber(`ORD-${numericOrderNumber}`);

// Before: Manual customer fetching
const customersResponse = await authenticatedFetch(`/api/customers?merchantId=${merchantId}&limit=100`);
const customersData = await customersResponse.json();

// After: Clean API functions
const customersResult = await customersApi.getCustomers({ 
  merchantId, 
  limit: 100 
});
```

## Benefits

### **1. Type Safety**
- All API functions have proper TypeScript interfaces
- Consistent response formats across all endpoints
- Better IntelliSense and error detection

### **2. Error Handling**
- Centralized error handling and parsing
- Consistent error response format
- Better debugging and logging

### **3. Maintainability**
- Single place to update API logic
- Consistent authentication handling
- Easy to add new features or modify existing ones

### **4. Reusability**
- Functions can be used across the entire application
- Consistent API interface everywhere
- Easy to test and mock

## Filter Interfaces

All API functions support consistent filtering:

```typescript
interface BaseFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

interface CustomerFilters extends BaseFilters {
  outletId?: number;
  merchantId?: number;
  isActive?: boolean;
}

interface ProductFilters extends BaseFilters {
  categoryId?: number;
  outletId?: number;
  merchantId?: number;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
}

interface OutletFilters extends BaseFilters {
  shopId?: number;
  merchantId?: number;
  isActive?: boolean;
}

interface CategoryFilters extends BaseFilters {
  parentId?: number;
  merchantId?: number;
  isActive?: boolean;
}
```

## Response Format

All API functions return a consistent response format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  hasMore: boolean;
}
```

## Authentication

All API functions automatically include authentication headers using the `authenticatedFetch` utility. No need to manually add tokens or headers.
