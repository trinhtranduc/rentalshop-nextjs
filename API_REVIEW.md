# Rental Shop API Documentation

## Product CRUD API

### Overview
The Product API provides comprehensive CRUD operations for managing rental products. Each product has stock management, rental pricing, and availability tracking.

### Base URL
```
/api/products
```

### Product Model
```typescript
interface Product {
  id: number;
  name: string;
  description?: string;
  stock: number;           // Total available stock
  renting: number;         // Currently being rented
  available: number;       // Available for rent (stock - renting)
  rentPrice: number;       // Daily rental price
  salePrice?: number;      // Optional sale price
  deposit: number;         // Security deposit
  images: string[];        // Array of image URLs
  categoryId: number;
  outletId: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### 1. Get All Products
**GET** `/api/products`

**Query Parameters:**
- `search` (string): Search by product name or description
- `outletId` (string): Filter by outlet
- `categoryId` (string): Filter by category
- `isAvailable` (boolean): Filter by availability
- `minPrice` (number): Minimum rent price
- `maxPrice` (number): Maximum rent price
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `sortBy` (string): Sort field (name, rentPrice, createdAt, stock)
- `sortOrder` (string): Sort direction (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "clx123",
        "name": "iPhone 15 Pro",
        "description": "Latest iPhone for rent",
        "stock": 10,
        "renting": 2,
        "available": 8,
        "rentPrice": 25.00,
        "salePrice": 999.00,
        "deposit": 200.00,
        "images": ["https://example.com/iphone1.jpg"],
        "category": { "name": "Electronics" },
        "outlet": { "name": "Downtown Rental Center" }
      }
    ],
    "total": 13,
    "page": 1,
    "totalPages": 2
  }
}
```

### 2. Get Product by ID
**GET** `/api/products/{id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx123",
    "name": "iPhone 15 Pro",
    "description": "Latest iPhone for rent",
    "stock": 10,
    "renting": 2,
    "available": 8,
    "rentPrice": 25.00,
    "salePrice": 999.00,
    "deposit": 200.00,
    "images": ["https://example.com/iphone1.jpg"],
    "category": { "name": "Electronics" },
    "outlet": { "name": "Downtown Rental Center" }
  }
}
```

### 3. Create Product
**POST** `/api/products`

**Request Body:**
```json
{
  "name": "New Product",
  "description": "Product description",
  "stock": 5,
  "rentPrice": 20.00,
  "salePrice": 200.00,
  "deposit": 50.00,
  "categoryId": "cat123",
  "outletId": "outlet123",
  "images": ["https://example.com/image1.jpg"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx124",
    "name": "New Product",
    "stock": 5,
    "renting": 0,
    "available": 5,
    "rentPrice": 20.00,
    "salePrice": 200.00,
    "deposit": 50.00,
    "images": ["https://example.com/image1.jpg"],
    "category": { "name": "Electronics" },
    "outlet": { "name": "Downtown Rental Center" }
  },
  "message": "Product created successfully"
}
```

### 4. Update Product
**PUT** `/api/products/{id}`

**Request Body:**
```json
{
  "name": "Updated Product Name",
  "stock": 8,
  "rentPrice": 25.00
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx123",
    "name": "Updated Product Name",
    "stock": 8,
    "renting": 2,
    "available": 6,
    "rentPrice": 25.00
  },
  "message": "Product updated successfully"
}
```

### 5. Delete Product
**DELETE** `/api/products/{id}`

**Query Parameters:**
- `hard` (boolean): Set to `true` for permanent deletion (default: soft delete)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx123",
    "isActive": false
  },
  "message": "Product deleted successfully"
}
```

### 6. Update Product Stock
**PATCH** `/api/products/{id}`

**Request Body:**
```json
{
  "quantity": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clx123",
    "stock": 15,
    "available": 13
  },
  "message": "Product stock updated successfully"
}
```

### 7. Check Product Availability
**GET** `/api/products/{id}/availability`

**Response:**
```json
{
  "success": true,
  "data": {
    "productId": "clx123",
    "isAvailable": true
  }
}
```

## Mobile API

### Mobile Products Endpoint
**GET** `/api/mobile/products`

Optimized for mobile apps with smaller batch sizes and simplified data structure.

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "clx123",
        "name": "iPhone 15 Pro",
        "description": "Latest iPhone for rent",
        "price": 25.00,
        "deposit": 200.00,
        "images": ["https://example.com/iphone1.jpg"],
        "isAvailable": true,
        "category": { "name": "Electronics" },
        "outlet": {
          "name": "Downtown Rental Center",
          "address": "123 Main Street"
        }
      }
    ],
    "total": 13,
    "page": 1,
    "totalPages": 2,
    "hasMore": true
  }
}
```

## Error Responses

### Validation Error
```json
{
  "success": false,
  "error": "Validation error",
  "details": "Name is required"
}
```

### Not Found Error
```json
{
  "success": false,
  "error": "Product not found"
}
```

### Server Error
```json
{
  "success": false,
  "error": "Internal server error",
  "details": "Database connection failed"
}
```

## Frontend Integration

### Client App Dashboard
- **URL**: `/dashboard`
- **Features**: Product browsing, search, filtering, rental actions
- **Components**: `ProductGrid`, `ProductCard` with client variant

### Admin App Dashboard
- **URL**: `/dashboard`
- **Features**: Product management, CRUD operations, bulk actions
- **Components**: `ProductGrid`, `ProductCard` with admin variant

### Mobile App
- **API**: `/api/mobile/products`
- **Features**: Optimized for mobile, infinite scroll, simplified UI
- **Components**: `ProductGrid`, `ProductCard` with mobile variant

## Database Schema

### Product Table
```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  outletId TEXT NOT NULL,
  categoryId TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stock INTEGER DEFAULT 0,
  renting INTEGER DEFAULT 0,
  available INTEGER DEFAULT 0,
  rentPrice REAL NOT NULL,
  salePrice REAL,
  deposit REAL DEFAULT 0,
  images TEXT NOT NULL,
  isActive BOOLEAN DEFAULT true,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (outletId) REFERENCES outlets(id),
  FOREIGN KEY (categoryId) REFERENCES categories(id)
);
```

## Seed Data

The database includes comprehensive seed data with:
- **6 Categories**: Electronics, Tools, Party Equipment, Sports Equipment, Furniture, Vehicles
- **3 Outlets**: Downtown Rental Center, Westside Equipment, Party Palace
- **13 Products**: Various items across all categories with realistic pricing
- **Sample Users**: Client, Admin, Merchant accounts

### Sample Products
1. iPhone 15 Pro - $25/day
2. MacBook Pro 16" - $50/day
3. DJ Equipment Set - $150/day
4. Power Drill Set - $15/day
5. Wedding Tent - $200/day
6. Mountain Bike - $30/day
7. Office Furniture Set - $40/day

## Best Practices

### DRY Principles
- ✅ Shared database operations in `@rentalshop/database`
- ✅ Reusable UI components in `@rentalshop/ui`
- ✅ Centralized validation in `@rentalshop/utils`
- ✅ Consistent error handling across all endpoints

### Performance
- ✅ Pagination for large datasets
- ✅ Optimized queries with proper indexing
- ✅ Mobile-specific endpoints with smaller payloads
- ✅ Image optimization and lazy loading

### Security
- ✅ Input validation with Zod schemas
- ✅ SQL injection prevention with Prisma
- ✅ Proper error handling without data leakage
- ✅ Authentication and authorization (to be implemented)

### Type Safety
- ✅ Full TypeScript coverage
- ✅ Shared type definitions
- ✅ Runtime validation
- ✅ Compile-time error checking 