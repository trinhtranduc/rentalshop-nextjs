# API Endpoints Documentation for Swift Integration

Tài liệu đầy đủ về tất cả API endpoints trong hệ thống Rental Shop để tích hợp với Swift project.

## 🔐 Authentication & Headers

### Base URL
```
Development: http://localhost:3002
Production: https://apis-development.up.railway.app
```

### Mobile Access Headers (Required for iOS/Swift)
```swift
headers: [
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_JWT_TOKEN",
    "X-Client-Platform": "mobile",
    "X-Device-Type": "ios", 
    "X-App-Version": "1.0.0",
    "User-Agent": "RentalShop-iOS/1.0.0"
]
```

### Web Access Headers (For reference)
```swift
headers: [
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_JWT_TOKEN",
    "X-Client-Platform": "web",
    "X-Device-Type": "browser",
    "User-Agent": "RentalShop-Web/1.0.0"
]
```

### Response Format
```json
{
    "success": true|false,
    "code": "SUCCESS_CODE",
    "message": "Success message",
    "data": {...},
    "error": "Error details (optional)"
}
```

### 🚨 Important Mobile Access Notes

**Platform Access Control**: The API uses platform detection to control access based on subscription plans:
- **Basic Plan**: Only allows mobile app access (`X-Client-Platform: mobile`)
- **Premium/Enterprise Plans**: Allow both mobile and web access

**Required Mobile Headers** for iOS/Swift apps:
```swift
let headers = [
    "X-Client-Platform": "mobile",  // Required for mobile access
    "X-Device-Type": "ios",         // Device type identification
    "X-App-Version": "1.0.0",       // App version for compatibility
    "User-Agent": "RentalShop-iOS/1.0.0"  // Custom user agent
]
```

**Platform Access Error**: If you receive a `PLATFORM_ACCESS_DENIED` error, ensure your headers include `X-Client-Platform: mobile`.

---

## 🔑 Authentication APIs

### 1. Login
**POST** `/api/auth/login`

**Request:**
```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

**Response:**
```json
{
    "success": true,
    "code": "LOGIN_SUCCESS",
    "message": "Login successful",
    "data": {
        "user": {
            "id": 123,
            "email": "user@example.com",
            "firstName": "John",
            "lastName": "Doe",
            "name": "John Doe",
            "phone": "+1234567890",
            "role": "OUTLET_ADMIN",
            "merchantId": 456,
            "outletId": 789,
            "merchant": {
                "id": 456,
                "name": "Merchant Name",
                "email": "merchant@example.com"
            },
            "outlet": {
                "id": 789,
                "name": "Outlet Name",
                "address": "123 Main St"
            }
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

### 2. Register
**POST** `/api/auth/register`

**Request:**
```json
{
    "firstName": "John",
    "lastName": "Doe",
    "email": "user@example.com",
    "password": "password123",
    "phone": "+1234567890",
    "role": "MERCHANT",
    "businessName": "My Business",
    "outletName": "Main Store"
}
```

### 3. Logout
**POST** `/api/auth/logout`
*Requires authentication*

### 4. Change Password
**POST** `/api/auth/change-password`
*Requires authentication*

**Request:**
```json
{
    "currentPassword": "oldpassword",
    "newPassword": "newpassword123"
}
```

### 5. Forget Password
**POST** `/api/auth/forget-password`

**Request:**
```json
{
    "email": "user@example.com"
}
```

### 6. Reset Password
**POST** `/api/auth/reset-password`

**Request:**
```json
{
    "token": "reset_token",
    "newPassword": "newpassword123"
}
```

---

## 👥 User Management APIs

### 1. Get Users
**GET** `/api/users`
*Requires: ADMIN, MERCHANT, OUTLET_ADMIN*

**Query Parameters:**
- `role`: User role (ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF)
- `isActive`: Boolean (true/false)
- `search`: Search query
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 123,
            "firstName": "John",
            "lastName": "Doe",
            "email": "user@example.com",
            "role": "OUTLET_ADMIN",
            "isActive": true,
            "merchantId": 456,
            "outletId": 789
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total": 100,
        "hasMore": true
    }
}
```

### 2. Create User
**POST** `/api/users`
*Requires: ADMIN, MERCHANT, OUTLET_ADMIN*

**Request:**
```json
{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "password": "password123",
    "phone": "+1234567890",
    "role": "OUTLET_STAFF",
    "merchantId": 456,
    "outletId": 789
}
```

### 3. Update User
**PUT** `/api/users?id=123`
*Requires: ADMIN, MERCHANT, OUTLET_ADMIN*

### 4. Get User Profile
**GET** `/api/users/profile`
*Requires authentication*

### 5. Get User by ID
**GET** `/api/users/[id]`
*Requires: ADMIN, MERCHANT, OUTLET_ADMIN*

---

## 🏪 Outlet Management APIs

### 1. Get Outlets
**GET** `/api/outlets`

**Query Parameters:**
- `merchantId`: Filter by merchant
- `isActive`: Boolean filter
- `search`: Search query
- `page`, `limit`: Pagination

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 123,
            "name": "Main Store",
            "address": "123 Main St",
            "phone": "+1234567890",
            "city": "New York",
            "isActive": true,
            "merchantId": 456
        }
    ]
}
```

### 2. Create Outlet
**POST** `/api/outlets`

**Request:**
```json
{
    "name": "New Store",
    "address": "456 Oak Ave",
    "phone": "+1234567890",
    "city": "Boston",
    "merchantId": 456
}
```

---

## 🛒 Product Management APIs

### 1. Get Products
**GET** `/api/products`

**Query Parameters:**
- `categoryId`: Filter by category
- `outletId`: Filter by outlet
- `available`: Boolean - show only available products
- `minPrice`, `maxPrice`: Price range
- `search`: Search query
- `page`, `limit`: Pagination
- `sortBy`: Field to sort by
- `sortOrder`: asc/desc

**Response:**
```json
{
    "success": true,
    "data": {
        "products": [
            {
                "id": 123,
                "name": "Drill Machine",
                "description": "Heavy duty drill",
                "barcode": "123456789",
                "totalStock": 10,
                "rentPrice": 25.00,
                "salePrice": 150.00,
                "deposit": 50.00,
                "available": 8,
                "renting": 2,
                "categoryId": 456,
                "merchantId": 789,
                "images": "[\"image1.jpg\", \"image2.jpg\"]",
                "isActive": true
            }
        ],
        "total": 100,
        "page": 1,
        "limit": 20,
        "hasMore": true
    }
}
```

### 2. Create Product
**POST** `/api/products`

**Request:**
```json
{
    "name": "New Product",
    "description": "Product description",
    "barcode": "987654321",
    "totalStock": 5,
    "rentPrice": 20.00,
    "salePrice": 100.00,
    "deposit": 30.00,
    "categoryId": 456,
    "merchantId": 789,
    "images": "[\"image1.jpg\"]"
}
```

### 3. Get Product by ID
**GET** `/api/products/[id]`

### 4. Update Product
**PUT** `/api/products/[id]`

### 5. Export Products
**GET** `/api/products/export`

### 6. Product Availability (Mobile App) ✅
**GET** `/api/products/availability`

**Query Parameters:**
- `productId`: Product ID to check availability for (required)
- `date`: Date to check availability in YYYY-MM-DD format (required)
- `outletId`: Outlet ID (required for merchants, auto-filled for outlet users)

**Description:**
This API is specifically designed for mobile app product availability screens. It returns all orders for a product while calculating availability based on the specific date. Only PICKUPED and RESERVED orders affect availability calculation.

**Request:**
```swift
GET /api/products/availability?productId=12&date=2025-10-24&outletId=1
```

**Response:**
```json
{
    "success": true,
    "code": "PRODUCT_AVAILABILITY_FOUND",
    "message": "Product availability information retrieved successfully",
    "data": {
        "product": {
            "id": 12,
            "name": "Product 12 - Kitchen Appliances",
            "barcode": "BAR000012",
            "outletId": 1,
            "outletName": "Main Branch"
        },
        "date": "2025-10-24",
        "summary": {
            "totalStock": 50,
            "totalRented": 2,        // Only PICKUPED orders
            "totalReserved": 0,      // Only RESERVED orders
            "totalAvailable": 48,    // totalStock - totalRented - totalReserved
            "isAvailable": true
        },
        "orders": [
            {
                "id": 1,
                "orderNumber": "ORD-001-0001",
                "orderType": "RENT",
                "status": "PICKUPED",
                "totalAmount": 100.00,
                "depositAmount": 50.00,
                "pickupPlanAt": "2025-10-06T10:00:00.000Z",
                "returnPlanAt": "2025-10-11T18:00:00.000Z",
                "pickedUpAt": "2025-10-06T10:30:00.000Z",
                "returnedAt": null,
                "createdAt": "2025-10-01T08:00:00.000Z",
                "updatedAt": "2025-10-06T10:30:00.000Z",
                "outletId": 1,
                "outletName": "Main Branch",
                "customerId": 123,
                "customerName": "John Smith",
                "customerPhone": "+1-555-1000",
                "customerEmail": "john@example.com",
                "merchantId": 1,
                "merchantName": "ABC Rental Shop",
                "orderItems": [
                    {
                        "id": 1,
                        "productId": 12,
                        "productName": "Product 12 - Kitchen Appliances",
                        "productBarcode": "BAR000012",
                        "quantity": 2,
                        "unitPrice": 25.00,
                        "totalPrice": 50.00,
                        "deposit": 25.00
                    }
                ]
            },
            {
                "id": 2,
                "orderNumber": "ORD-001-0002",
                "orderType": "SALE",
                "status": "RESERVED",
                "totalAmount": 150.00,
                "depositAmount": 0.00,
                "pickupPlanAt": "2025-10-25T10:00:00.000Z",
                "returnPlanAt": null,
                "pickedUpAt": null,
                "returnedAt": null,
                "createdAt": "2025-10-20T08:00:00.000Z",
                "updatedAt": "2025-10-20T08:00:00.000Z",
                "outletId": 1,
                "outletName": "Main Branch",
                "customerId": 124,
                "customerName": "Jane Doe",
                "customerPhone": "+1-555-1001",
                "customerEmail": "jane@example.com",
                "merchantId": 1,
                "merchantName": "ABC Rental Shop",
                "orderItems": [
                    {
                        "id": 2,
                        "productId": 12,
                        "productName": "Product 12 - Kitchen Appliances",
                        "productBarcode": "BAR000012",
                        "quantity": 1,
                        "unitPrice": 150.00,
                        "totalPrice": 150.00,
                        "deposit": 0.00
                    }
                ]
            }
        ],
        "meta": {
            "totalOrders": 2,
            "date": "2025-10-24",
            "checkedAt": "2025-10-24T15:48:00.000Z"
        }
    }
}
```

**Mobile App Integration Notes:**
- **KHO (Stock)**: `summary.totalStock`
- **CÓ SẴN (Available)**: `summary.totalAvailable` 
- **ĐANG THUÊ (Currently Rented)**: `summary.totalRented` (only PICKUPED orders)
- **ĐANG CỌC (Reserved)**: `summary.totalReserved` (only RESERVED orders)
- **Orders List**: `orders[]` contains ALL orders (including COMPLETED)
- **Availability Calculation**: Only considers orders active on the specified date

**Swift Implementation:**
```swift
struct ProductAvailabilityResponse: Codable {
    let success: Bool
    let code: String
    let message: String
    let data: ProductAvailabilityData
}

struct ProductAvailabilityData: Codable {
    let product: ProductInfo
    let date: String
    let summary: AvailabilitySummary
    let orders: [OrderInfo]
    let meta: AvailabilityMeta
}

struct AvailabilitySummary: Codable {
    let totalStock: Int
    let totalRented: Int      // Only PICKUPED orders
    let totalReserved: Int    // Only RESERVED orders  
    let totalAvailable: Int   // Calculated: totalStock - totalRented - totalReserved
    let isAvailable: Bool
}

struct OrderInfo: Codable {
    // Basic order info
    let id: Int
    let orderNumber: String
    let orderType: String
    let status: String
    let totalAmount: Double
    let depositAmount: Double
    
    // Dates (ISO format)
    let pickupPlanAt: String?
    let returnPlanAt: String?
    let pickedUpAt: String?
    let returnedAt: String?
    let createdAt: String
    let updatedAt: String
    
    // Flattened outlet info
    let outletId: Int
    let outletName: String
    
    // Flattened customer info
    let customerId: Int?
    let customerName: String
    let customerPhone: String?
    let customerEmail: String?
    
    // Flattened merchant info
    let merchantId: Int
    let merchantName: String
    
    // Order items (only for this product)
    let orderItems: [OrderItemInfo]
}

struct OrderItemInfo: Codable {
    let id: Int
    let productId: Int
    let productName: String
    let productBarcode: String?
    let quantity: Int
    let unitPrice: Double
    let totalPrice: Double
    let deposit: Double
}
```

---

## 📋 Category Management APIs

### 1. Get Categories
**GET** `/api/categories`

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 123,
            "name": "Tools",
            "description": "Power tools and hand tools",
            "isActive": true,
            "isDefault": false,
            "merchantId": 456
        }
    ]
}
```

### 2. Create Category
**POST** `/api/categories`

**Request:**
```json
{
    "name": "New Category",
    "description": "Category description",
    "merchantId": 456
}
```

### 3. Get Category by ID
**GET** `/api/categories/[id]`

### 4. Update Category
**PUT** `/api/categories/[id]`

---

## 👤 Customer Management APIs

### 1. Get Customers
**GET** `/api/customers`

**Query Parameters:**
- `search`: Search query (name, phone, email)
- `merchantId`: Filter by merchant
- `isActive`: Boolean filter
- `city`, `state`, `country`: Location filters
- `page`, `limit`: Pagination

**Response:**
```json
{
    "success": true,
    "data": {
        "customers": [
            {
                "id": 123,
                "firstName": "John",
                "lastName": "Doe",
                "email": "john@example.com",
                "phone": "+1234567890",
                "address": "123 Main St",
                "city": "New York",
                "isActive": true,
                "merchantId": 456,
                "createdAt": "2024-01-01T00:00:00Z"
            }
        ],
        "total": 50,
        "page": 1,
        "limit": 20,
        "hasMore": true
    }
}
```

### 2. Create Customer
**POST** `/api/customers`

**Request:**
```json
{
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "address": "456 Oak Ave",
    "city": "Boston",
    "merchantId": 456
}
```

### 3. Update Customer
**PUT** `/api/customers?id=123`

### 4. Get Customer by ID
**GET** `/api/customers/[id]`

### 5. Get Customer Orders
**GET** `/api/customers/[id]/orders`

---

## 📦 Order Management APIs

### 1. Get Orders
**GET** `/api/orders`

**Query Parameters:**
- `orderType`: RENT, SALE
- `status`: RESERVED, PICKUPED, RETURNED, COMPLETED, CANCELLED
- `outletId`: Filter by outlet
- `customerId`: Filter by customer
- `productId`: Filter by product
- `startDate`, `endDate`: Date range
- `search`: Search query
- `page`, `limit`: Pagination

**Response:**
```json
{
    "success": true,
    "data": {
        "orders": [
            {
                "id": 123,
                "orderNumber": "ORD-001-0001",
                "orderType": "RENT",
                "status": "RESERVED",
                "totalAmount": 100.00,
                "depositAmount": 50.00,
                "pickupPlanAt": "2024-01-15T10:00:00Z",
                "returnPlanAt": "2024-01-20T18:00:00Z",
                "createdAt": "2024-01-10T08:00:00Z",
                "outletId": 456,
                "customerId": 789,
                "createdById": 101,
                "customer": {
                    "id": 789,
                    "firstName": "John",
                    "lastName": "Doe",
                    "phone": "+1234567890"
                },
                "orderItems": [
                    {
                        "id": 201,
                        "productId": 301,
                        "productName": "Drill Machine",
                        "quantity": 1,
                        "unitPrice": 25.00,
                        "totalPrice": 25.00,
                        "deposit": 50.00
                    }
                ]
            }
        ],
        "total": 200,
        "page": 1,
        "limit": 20,
        "hasMore": true
    }
}
```

### 2. Create Order
**POST** `/api/orders`
*Requires: ADMIN, MERCHANT, OUTLET_ADMIN*

**Request:**
```json
{
    "orderType": "RENT",
    "outletId": 456,
    "customerId": 789,
    "totalAmount": 100.00,
    "depositAmount": 50.00,
    "pickupPlanAt": "2024-01-15T10:00:00Z",
    "returnPlanAt": "2024-01-20T18:00:00Z",
    "orderItems": [
        {
            "productId": 301,
            "quantity": 1,
            "unitPrice": 25.00,
            "totalPrice": 25.00,
            "deposit": 50.00
        }
    ]
}
```

### 3. Update Order ✅
**PUT** `/api/orders/[orderId]`
*Requires: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF*

**Description:** Update an existing order with comprehensive field support

**Path Parameters:**
- `orderId` (required): Order ID (integer)

**Request Body:**
```json
{
  "status": "PICKUPED",
  "totalAmount": 250.00,
  "depositAmount": 100.00,
  "securityDeposit": 50.00,
  "damageFee": 0,
  "lateFee": 0,
  "discountType": "amount",
  "discountValue": 0,
  "discountAmount": 0,
  "pickupPlanAt": "2025-10-06T10:00:00.000Z",
  "returnPlanAt": "2025-10-11T18:00:00.000Z",
  "pickedUpAt": "2025-10-06T10:30:00.000Z",
  "returnedAt": null,
  "rentalDuration": 5,
  "isReadyToDeliver": true,
  "collateralType": "CASH",
  "collateralDetails": "Driver License",
  "notes": "Updated order notes",
  "pickupNotes": "Customer arrived on time",
  "returnNotes": "Expected return on 10/11/2025",
  "damageNotes": "",
  "customerId": 123,
  "customerName": "John Smith",
  "customerPhone": "+1-555-1000",
  "customerEmail": "john@example.com",
  "outletId": 1,
  "orderItems": [
    {
      "productId": 12,
      "quantity": 2,
      "unitPrice": 25.00,
      "totalPrice": 50.00,
      "deposit": 25.00,
      "notes": "Updated item notes",
      "rentalDays": 5
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderNumber": "ORD-001-0001",
    "orderType": "RENT",
    "status": "PICKUPED",
    "totalAmount": 250.00,
    "depositAmount": 100.00,
    "securityDeposit": 50.00,
    "damageFee": 0,
    "lateFee": 0,
    "discountType": "amount",
    "discountValue": 0,
    "discountAmount": 0,
    "pickupPlanAt": "2025-10-06T10:00:00.000Z",
    "returnPlanAt": "2025-10-11T18:00:00.000Z",
    "pickedUpAt": "2025-10-06T10:30:00.000Z",
    "returnedAt": null,
    "rentalDuration": 5,
    "isReadyToDeliver": true,
    "collateralType": "CASH",
    "collateralDetails": "Driver License",
    "notes": "Updated order notes",
    "pickupNotes": "Customer arrived on time",
    "returnNotes": "Expected return on 10/11/2025",
    "damageNotes": "",
    "createdAt": "2025-10-01T08:00:00.000Z",
    "updatedAt": "2025-10-06T10:30:00.000Z",
    "customerId": 123,
    "customerName": "John Smith",
    "customerPhone": "+1-555-1000",
    "customerEmail": "john@example.com",
    "outletId": 1,
    "outletName": "Main Branch",
    "merchantName": "ABC Rental Shop",
    "createdById": 1004,
    "createdByName": "Admin Outlet 1",
    "orderItems": [
      {
        "id": 1,
        "productId": 12,
        "productName": "Product 12 - Kitchen Appliances",
        "productBarcode": "BAR000012",
        "quantity": 2,
        "unitPrice": 25.00,
        "totalPrice": 50.00,
        "deposit": 25.00,
        "notes": "Updated item notes",
        "rentalDays": 5
      }
    ],
    "itemCount": 1,
    "paymentCount": 0,
    "totalPaid": 0
  },
  "code": "ORDER_UPDATED_SUCCESS",
  "message": "Order updated successfully"
}
```

**Field Validation:**
- All financial fields must be non-negative numbers
- Date fields accept ISO 8601 format strings
- `collateralType` must be one of: CASH, CREDIT_CARD, ID_CARD, DOCUMENT, OTHER
- `discountType` must be one of: amount, percentage
- `orderType` must be one of: RENT, SALE
- `status` must be one of: RESERVED, PICKUPED, RETURNED, COMPLETED, CANCELLED
- `customerEmail` must be valid email format if provided
- `orderItems` array is optional for updates

### 4. Get Order by ID
**GET** `/api/orders/[orderId]`

### 5. Get Order by Number
**GET** `/api/orders/by-number/[orderNumber]`

### 6. Update Order Status
**PUT** `/api/orders/[orderId]/status`

**Request:**
```json
{
    "status": "PICKUPED",
    "notes": "Customer picked up items"
}
```

---

## 💳 Payment APIs

### 1. Get Payments
**GET** `/api/payments`

**Query Parameters:**
- `orderId`: Filter by order
- `status`: PENDING, COMPLETED, FAILED, CANCELLED
- `method`: Payment method
- `page`, `limit`: Pagination

**Response:**
```json
{
    "success": true,
    "data": [
        {
            "id": 123,
            "amount": 100.00,
            "currency": "USD",
            "method": "cash",
            "type": "deposit",
            "status": "COMPLETED",
            "orderId": 456,
            "createdAt": "2024-01-10T08:00:00Z"
        }
    ]
}
```

### 2. Create Payment
**POST** `/api/payments`

### 3. Process Payment
**POST** `/api/payments/process`

### 4. Manual Payment
**POST** `/api/payments/manual`

---

## 🏢 Merchant Management APIs

### 1. Get Merchants
**GET** `/api/merchants`
*Requires: ADMIN*

### 2. Create Merchant
**POST** `/api/merchants`
*Requires: ADMIN*

### 3. Register Merchant
**POST** `/api/merchants/register`
*Public endpoint for new merchant registration*

### 4. Get Merchant by ID
**GET** `/api/merchants/[id]`

### 5. Get Merchant Orders
**GET** `/api/merchants/[id]/orders`

### 6. Get Merchant Users
**GET** `/api/merchants/[id]/users`

### 7. Get Merchant Outlets
**GET** `/api/merchants/[id]/outlets`

---

## 📊 Analytics APIs

### 1. Dashboard Analytics
**GET** `/api/analytics/dashboard`

**Response:**
```json
{
    "success": true,
    "data": {
        "totalOrders": 150,
        "totalRevenue": 15000.00,
        "totalCustomers": 75,
        "totalProducts": 200,
        "todayOrders": 5,
        "todayRevenue": 500.00
    }
}
```

### 2. Orders Analytics
**GET** `/api/analytics/orders`

### 3. Income Analytics
**GET** `/api/analytics/income`

### 4. Top Customers
**GET** `/api/analytics/top-customers`

### 5. Top Products
**GET** `/api/analytics/top-products`

### 6. Recent Activities
**GET** `/api/analytics/recent-activities`

---

## 📅 Calendar APIs

### 1. Calendar Orders
**GET** `/api/calendar/orders`

**Query Parameters:**
- `startDate`: Start date for calendar view
- `endDate`: End date for calendar view
- `outletId`: Filter by outlet

---

## 📱 Mobile APIs

### 1. Mobile Login
**POST** `/api/mobile/auth/login`
*Optimized for mobile app login*

### 2. Register Device
**POST** `/api/mobile/notifications/register-device`
*For push notifications*

**Request:**
```json
{
    "deviceToken": "device_fcm_token",
    "deviceType": "ios",
    "userId": 123
}
```

### 3. Sync Check
**GET** `/api/mobile/sync/check`
*Check for data syncing requirements*

---

## 🔧 System APIs

### 1. Health Check
**GET** `/api/health`

**Response:**
```json
{
    "success": true,
    "data": {
        "status": "healthy",
        "timestamp": "2024-01-10T08:00:00Z",
        "version": "1.0.0"
    }
}
```

### 2. Database Health
**GET** `/api/health/database`

### 3. Volume Health
**GET** `/api/health/volume`

### 4. System Integrity
**GET** `/api/system/integrity`

---

## 📄 File Upload APIs

### 1. Upload Image
**POST** `/api/upload/image`
*Multipart form data*

**Request:**
```
Content-Type: multipart/form-data
file: [image file]
type: product|customer|user
```

---

## 🔑 API Key Management

### 1. Get API Keys
**GET** `/api/system/api-keys`
*Requires: ADMIN, MERCHANT*

### 2. Create API Key
**POST** `/api/system/api-keys`

---

## 📋 Plan & Subscription APIs

### 1. Get Plans
**GET** `/api/plans`

### 2. Get Public Plans
**GET** `/api/plans/public`

### 3. Get Subscriptions
**GET** `/api/subscriptions`

### 4. Get Subscription Status
**GET** `/api/subscriptions/status`

---

## 📊 Audit & Logs APIs

### 1. Get Audit Logs
**GET** `/api/audit-logs`

### 2. Get Audit Log Stats
**GET** `/api/audit-logs/stats`

---

## 🔍 Swift Integration Patterns

### 1. HTTP Client Setup
```swift
struct APIClient {
    private let baseURL = "https://apis-development.up.railway.app"
    private let devBaseURL = "http://localhost:3002"
    private let session = URLSession.shared
    
    // Mobile-specific headers for iOS access
    private var mobileHeaders: [String: String] {
        return [
            "Content-Type": "application/json",
            "X-Client-Platform": "mobile",
            "X-Device-Type": "ios",
            "X-App-Version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0",
            "User-Agent": "RentalShop-iOS/1.0.0"
        ]
    }
    
    func request<T: Codable>(
        endpoint: String,
        method: HTTPMethod,
        body: Data? = nil,
        token: String? = nil,
        useDevServer: Bool = false
    ) -> AnyPublisher<T, Error> {
        let urlString = (useDevServer ? devBaseURL : baseURL) + endpoint
        
        guard let url = URL(string: urlString) else {
            return Fail(error: APIError.invalidURL)
                .eraseToAnyPublisher()
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.httpBody = body
        
        // Add mobile headers
        for (key, value) in mobileHeaders {
            request.setValue(value, forHTTPHeaderField: key)
        }
        
        // Add authorization header if token provided
        if let token = token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        return session.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: T.self, decoder: JSONDecoder())
            .eraseToAnyPublisher()
    }
}
```

### 2. Authentication Manager
```swift
class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var user: User?
    private var token: String?
    
    func login(email: String, password: String) async throws {
        // Login implementation
    }
    
    func logout() {
        // Logout implementation
    }
}
```

### 3. Model Mapping
```swift
struct Order: Codable {
    let id: Int
    let orderNumber: String
    let orderType: String
    let status: String
    let totalAmount: Double
    let createdAt: String
    let customerId: Int?
    let orderItems: [OrderItem]?
}
```

### 4. Error Handling
```swift
enum APIError: Error {
    case invalidURL
    case invalidResponse
    case unauthorized
    case platformAccessDenied
    case networkError(Error)
    case serverError(String)
    case validationError([String: [String]])
}

// Enhanced error handling for mobile access
extension APIClient {
    func handleAPIError(_ response: APIResponse) throws {
        if !response.success {
            switch response.code {
            case "PLATFORM_ACCESS_DENIED":
                throw APIError.platformAccessDenied
            case "INVALID_CREDENTIALS", "ACCESS_TOKEN_REQUIRED":
                throw APIError.unauthorized
            case "VALIDATION_ERROR":
                throw APIError.validationError(response.errors ?? [:])
            default:
                throw APIError.serverError(response.message ?? "Unknown error")
            }
        }
    }
}
```

---

## 🚨 Error Codes Reference

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | Wrong email/password | 401 |
| `ACCESS_TOKEN_REQUIRED` | Missing authorization header | 401 |
| `INSUFFICIENT_PERMISSIONS` | User lacks required role | 403 |
| `PLATFORM_ACCESS_DENIED` | Platform access denied (check headers) | 403 |
| `PLAN_LIMIT_EXCEEDED` | Subscription limit reached | 403 |
| `ENTITY_NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `DUPLICATE_ENTITY` | Entity already exists | 409 |
| `INTERNAL_SERVER_ERROR` | Server error | 500 |

---

## 🔒 Role-Based Access Control

### User Roles:
- **ADMIN**: Full system access
- **MERCHANT**: Organization-wide access
- **OUTLET_ADMIN**: Outlet-level access with management
- **OUTLET_STAFF**: Limited outlet access

### Access Matrix:
```
                 | ADMIN | MERCHANT | OUTLET_ADMIN | OUTLET_STAFF
Users            |   ✓   |    ✓     |      ✓       |      ✗
Merchants        |   ✓   |    ✗     |      ✗       |      ✗
Outlets          |   ✓   |    ✓     |      ✓       |      ✗
Products         |   ✓   |    ✓     |      ✓       |      ✓
Orders           |   ✓   |    ✓     |      ✓       |      ✓
Customers        |   ✓   |    ✓     |      ✓       |      ✓
Analytics        |   ✓   |    ✓     |      ✓       |      ✗
```

This documentation provides complete API reference for Swift integration with proper authentication, error handling, and data mapping patterns.
