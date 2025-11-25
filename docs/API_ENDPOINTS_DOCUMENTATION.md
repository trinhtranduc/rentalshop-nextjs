# API Endpoints Documentation for Mobile Integration

Complete API reference documentation for Rental Shop system integration with mobile applications (iOS, Android, React Native).

## Table of Contents

1. [Authentication & Headers](#authentication--headers)
2. [Authentication APIs](#authentication-apis)
3. [Product Management APIs](#product-management-apis)
4. [Order Management APIs](#order-management-apis)
5. [Customer Management APIs](#customer-management-apis)
6. [Category Management APIs](#category-management-apis)
7. [User Profile APIs](#user-profile-apis)
8. [Analytics APIs](#analytics-apis)
9. [Error Handling](#error-handling)
10. [Role-Based Access Control](#role-based-access-control)

---

## Authentication & Headers

### Base URL
```
Development: http://localhost:3002
Production: https://api.anyrent.shop
```

### Required Headers for Mobile Apps

All API requests must include these headers:

```json
{
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_JWT_TOKEN",
    "X-Client-Platform": "mobile",
  "X-Device-Type": "ios|android",
    "X-App-Version": "1.0.0",
  "User-Agent": "RentalShop-Mobile/1.0.0"
}
```

**Important Notes:**
- `X-Client-Platform: mobile` is **required** for mobile app access
- `Authorization: Bearer <token>` is required for authenticated endpoints
- Platform access is controlled by subscription plans:
  - **Basic Plan**: Mobile access only
  - **Professional/Enterprise Plans**: Both mobile and web access

### Response Format

All API responses follow this standard format:

**Success Response:**
```json
{
  "success": true,
    "code": "SUCCESS_CODE",
    "message": "Success message",
  "data": {
    // Response data here
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Error message",
  "error": "Detailed error information (optional)"
}
```

**Validation Error Response:**
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "error": {
    "fieldErrors": {
      "email": ["Invalid email format"],
      "password": ["Password must be at least 6 characters"]
    }
  }
}
```

---

## Authentication APIs

### 1. Login

**POST** `/api/auth/login`

Authenticate user and receive JWT token with user profile data.

**Request Headers:**
```
Content-Type: application/json
X-Client-Platform: mobile
X-Device-Type: ios|android
```

**Request Body:**
```json
{
    "email": "user@example.com",
    "password": "password123"
}
```

**Response (200 OK):**
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
      "emailVerified": true,
      "emailVerifiedAt": "2024-01-01T00:00:00Z",
            "merchant": {
                "id": 456,
                "name": "Merchant Name",
        "email": "merchant@example.com",
        "phone": "+1234567890",
        "address": "123 Main St",
        "city": "New York",
        "state": "NY",
        "zipCode": "10001",
        "country": "US",
        "businessType": "EQUIPMENT",
        "pricingType": "DAILY",
        "currency": "USD",
        "subscription": {
          "id": 789,
          "merchantId": 456,
          "planId": 1,
          "status": "ACTIVE",
          "currentPeriodStart": "2024-01-01T00:00:00Z",
          "currentPeriodEnd": "2024-02-01T00:00:00Z",
          "trialStart": "2024-01-01T00:00:00Z",
          "trialEnd": "2024-01-15T00:00:00Z",
          "cancelAtPeriodEnd": false,
          "amount": 79000,
          "currency": "VND",
          "interval": "month",
          "intervalCount": 1,
          "plan": {
            "id": 1,
            "name": "Basic",
            "description": "Perfect for small rental businesses",
            "basePrice": 79000,
            "currency": "VND",
            "trialDays": 14,
            "features": [
              {
                "name": "Mobile app access",
                "description": "Access your business on mobile devices",
                "included": true
              }
            ],
            "limits": {
              "outlets": 1,
              "users": 3,
              "products": 500,
              "customers": 2000,
              "orders": 2000
            },
            "isActive": true,
            "isPopular": false
          }
        }
            },
            "outlet": {
                "id": 789,
                "name": "Outlet Name",
        "address": "123 Main St",
        "merchantId": 456
            }
        },
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
}
```

**Error Responses:**

- **401 Unauthorized** - Invalid credentials:
```json
{
  "success": false,
  "code": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

- **403 Forbidden** - Account deactivated:
```json
{
  "success": false,
  "code": "ACCOUNT_DEACTIVATED",
  "message": "Account has been deactivated"
}
```

- **403 Forbidden** - Email not verified:
```json
{
  "success": false,
  "code": "EMAIL_NOT_VERIFIED",
  "message": "Please verify your email before logging in"
}
```

---

### 2. Register

**POST** `/api/auth/register`

Register a new user account. Supports both merchant registration (with business setup) and basic user registration.

**Request Headers:**
```
Content-Type: application/json
X-Client-Platform: mobile
```

**Request Body (Merchant Registration):**
```json
{
    "firstName": "John",
    "lastName": "Doe",
  "email": "merchant@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "role": "MERCHANT",
  "businessName": "My Rental Business",
  "outletName": "Main Store",
  "businessType": "EQUIPMENT",
  "pricingType": "DAILY",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "US",
  "tenantKey": "mybusiness" // Optional: custom subdomain
}
```

**Request Body (Basic User Registration):**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
    "email": "user@example.com",
    "password": "password123",
    "phone": "+1234567890",
  "role": "CLIENT" // Optional, defaults to CLIENT
}
```

**Response (201 Created) - Merchant Registration:**
```json
{
  "success": true,
  "code": "MERCHANT_REGISTERED_SUCCESS",
  "message": "Merchant registered successfully",
  "data": {
    "user": {
      "id": 123,
      "email": "merchant@example.com",
      "firstName": "John",
      "lastName": "Doe",
    "role": "MERCHANT",
      "emailVerified": false
    },
    "merchant": {
      "id": 456,
      "name": "My Rental Business",
      "email": "merchant@example.com"
    },
    "outlet": {
      "id": 789,
      "name": "Main Store"
    },
    "subscription": {
      "planName": "Trial",
      "trialEnd": "2024-01-15T00:00:00Z",
      "daysRemaining": 14
    },
    "requiresEmailVerification": true
  }
}
```

**Response (201 Created) - Basic User Registration:**
```json
{
  "success": true,
  "code": "USER_ACCOUNT_CREATED_PENDING_VERIFICATION",
  "message": "User account created successfully",
  "data": {
    "user": {
      "id": 123,
      "email": "user@example.com",
      "firstName": "Jane",
      "lastName": "Smith",
      "role": "CLIENT",
      "emailVerified": false
    },
    "requiresEmailVerification": true
  }
}
```

**Error Responses:**

- **409 Conflict** - Email already exists:
```json
{
  "success": false,
  "code": "EMAIL_ALREADY_EXISTS",
  "message": "Email already exists"
}
```

- **409 Conflict** - Merchant duplicate:
```json
{
  "success": false,
  "code": "MERCHANT_DUPLICATE",
  "message": "A merchant with this email already exists"
}
```

---

### 3. Logout

**POST** `/api/auth/logout`

Logout user and invalidate their session.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
X-Client-Platform: mobile
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "success": true,
  "code": "LOGOUT_SUCCESS",
  "message": "Logged out successfully",
  "data": {
    "message": "Logged out successfully"
  }
}
```

**Error Responses:**

- **401 Unauthorized** - Missing token:
```json
{
  "success": false,
  "code": "ACCESS_TOKEN_REQUIRED",
  "message": "Access token required"
}
```

---

### 4. Change Password

**POST** `/api/auth/change-password`

Change current user's password.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
X-Client-Platform: mobile
```

**Request Body:**
```json
{
  "currentPassword": "oldpassword123",
    "newPassword": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "code": "PASSWORD_CHANGED_SUCCESS",
  "message": "Password changed successfully"
}
```

**Error Responses:**

- **400 Bad Request** - Current password incorrect:
```json
{
  "success": false,
  "code": "CURRENT_PASSWORD_INCORRECT",
  "message": "Current password is incorrect"
}
```

- **400 Bad Request** - Password too short:
```json
{
  "success": false,
  "code": "PASSWORD_MIN_LENGTH",
  "message": "Password must be at least 6 characters long"
}
```

---

### 5. Forgot Password

**POST** `/api/auth/forgot-password`

Request password reset email. Always returns success for security (doesn't reveal if email exists).

**Request Headers:**
```
Content-Type: application/json
X-Client-Platform: mobile
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
    "success": true,
  "code": "PASSWORD_RESET_LINK_SENT",
  "message": "If email exists in system, password reset email has been sent",
  "data": {
    "message": "If email exists in system, password reset email has been sent"
  }
}
```

**Note:** This endpoint always returns success (even if email doesn't exist) to prevent email enumeration attacks.

---

### 6. Reset Password

**POST** `/api/auth/reset-password`

Reset password using reset token from email.

**Request Headers:**
```
Content-Type: application/json
X-Client-Platform: mobile
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "code": "PASSWORD_RESET_SUCCESS",
  "message": "Password has been reset successfully. Please login with new password",
  "data": {
    "message": "Password has been reset successfully. Please login with new password"
    }
}
```

**Error Responses:**

- **400 Bad Request** - Invalid or expired token:
```json
{
  "success": false,
  "code": "PASSWORD_RESET_TOKEN_INVALID",
  "message": "Token is invalid or expired"
}
```

- **400 Bad Request** - Token already used:
```json
{
  "success": false,
  "code": "PASSWORD_RESET_TOKEN_USED",
  "message": "Token has already been used"
}
```

- **400 Bad Request** - Passwords don't match:
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "error": {
    "fieldErrors": {
      "confirmPassword": ["Passwords don't match"]
    }
  }
}
```

---

### 7. Verify Email

**POST** `/api/auth/verify-email`

Verify user email using verification token from email.

**Request Headers:**
```
Content-Type: application/json
X-Client-Platform: mobile
```

**Request Body:**
```json
{
  "token": "verification_token_from_email"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "code": "EMAIL_VERIFIED_SUCCESS",
  "message": "Email verified successfully",
  "data": {
    "user": {
            "id": 123,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "MERCHANT",
      "emailVerified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        }
}
```

**Error Responses:**

- **400 Bad Request** - Invalid or expired token:
```json
{
  "success": false,
  "code": "EMAIL_VERIFICATION_FAILED",
  "message": "Token is invalid or expired"
}
```

---

### 8. Resend Verification Email

**POST** `/api/auth/resend-verification`

Resend email verification link.

**Request Headers:**
```
Content-Type: application/json
X-Client-Platform: mobile
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "code": "VERIFICATION_EMAIL_SENT",
  "message": "If email exists in system, verification email has been sent",
  "data": {
    "message": "If email exists in system, verification email has been sent"
  }
}
```

---

## Product Management APIs

### 1. Get Products

**GET** `/api/products`

Get products with filtering, search, and pagination.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Query Parameters:**
- `categoryId` (number, optional): Filter by category ID
- `outletId` (number, optional): Filter by outlet ID
- `available` (boolean, optional): Show only available products (true/false)
- `minPrice` (number, optional): Minimum price filter
- `maxPrice` (number, optional): Maximum price filter
- `search` or `q` (string, optional): Search query (searches name, barcode, description)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `sortBy` (string, optional): Field to sort by (name, createdAt, rentPrice, salePrice)
- `sortOrder` (string, optional): Sort order (asc, desc, default: desc)

**Example Request:**
```
GET /api/products?outletId=1&available=true&search=drill&page=1&limit=20&sortBy=name&sortOrder=asc
```

**Response (200 OK):**
```json
{
    "success": true,
  "code": "PRODUCTS_FOUND",
  "message": "Products retrieved successfully",
    "data": {
        "products": [
            {
                "id": 123,
                "name": "Drill Machine",
        "description": "Heavy duty drill machine",
                "barcode": "123456789",
                "totalStock": 10,
        "renting": 2,
        "available": 8,
                "rentPrice": 25.00,
                "salePrice": 150.00,
                "deposit": 50.00,
        "images": ["image1.jpg", "image2.jpg"],
                "categoryId": 456,
                "merchantId": 789,
        "outletId": 1,
        "isActive": true,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "category": {
          "id": 456,
          "name": "Tools"
        }
            }
        ],
        "total": 100,
        "page": 1,
        "limit": 20,
    "hasMore": true,
    "totalPages": 5
    }
}
```

**Error Responses:**

- **400 Bad Request** - Validation error:
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "error": {
    "fieldErrors": {
      "outletId": ["Invalid outlet ID format"]
    }
  }
}
```

---

### 2. Get Product by ID

**GET** `/api/products/[id]`

Get detailed product information by ID.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Path Parameters:**
- `id` (number): Product ID

**Example Request:**
```
GET /api/products/123
```

**Response (200 OK):**
```json
{
  "success": true,
  "code": "PRODUCT_RETRIEVED_SUCCESS",
  "message": "Product retrieved successfully",
  "data": {
    "id": 123,
    "name": "Drill Machine",
    "description": "Heavy duty drill machine",
    "barcode": "123456789",
    "totalStock": 10,
    "renting": 2,
    "available": 8,
    "rentPrice": 25.00,
    "salePrice": 150.00,
    "deposit": 50.00,
    "images": ["image1.jpg", "image2.jpg"],
    "categoryId": 456,
    "merchantId": 789,
    "outletId": 1,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "category": {
      "id": 456,
      "name": "Tools"
    },
    "merchant": {
      "id": 789,
      "name": "Merchant Name"
    }
  }
}
```

**Error Responses:**

- **404 Not Found**:
```json
{
  "success": false,
  "code": "PRODUCT_NOT_FOUND",
  "message": "Product not found"
}
```

---

### 3. Product Availability (Mobile-Specific)

**GET** `/api/products/availability`

Check product availability for a specific date. Returns availability summary and all orders for that product.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Query Parameters:**
- `productId` (number, required): Product ID to check
- `date` (string, required): Date in YYYY-MM-DD format
- `outletId` (number, required for MERCHANT/ADMIN, auto-filled for OUTLET users): Outlet ID

**Example Request:**
```
GET /api/products/availability?productId=12&date=2025-10-24&outletId=1
```

**Response (200 OK):**
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
      "totalRented": 2,
      "totalReserved": 0,
      "totalAvailable": 48,
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
- **Total Stock (KHO)**: `summary.totalStock`
- **Available (CÓ SẴN)**: `summary.totalAvailable`
- **Currently Rented (ĐANG THUÊ)**: `summary.totalRented` (only PICKUPED orders)
- **Reserved (ĐANG CỌC)**: `summary.totalReserved` (only RESERVED orders)
- **Orders List**: `orders[]` contains ALL orders (including COMPLETED)
- **Availability Calculation**: Only considers orders active on the specified date

**Error Responses:**

- **400 Bad Request** - Invalid date format:
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "error": {
    "fieldErrors": {
      "date": ["Date must be in YYYY-MM-DD format"]
    }
  }
}
```

- **400 Bad Request** - Date in past:
```json
{
  "success": false,
  "code": "INVALID_DATE",
  "message": "Date cannot be in the past"
}
```

- **400 Bad Request** - Outlet required:
```json
{
  "success": false,
  "code": "OUTLET_REQUIRED",
  "message": "Outlet ID is required for merchants"
}
```

---

### 4. Create Product

**POST** `/api/products`

Create a new product. Requires ADMIN, MERCHANT, or OUTLET_ADMIN role.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
X-Client-Platform: mobile
```

**Request Body (Form Data):**
- `name` (string, required): Product name
- `description` (string, optional): Product description
- `barcode` (string, optional): Product barcode
- `totalStock` (number, required): Total stock quantity
- `rentPrice` (number, required): Rental price
- `salePrice` (number, optional): Sale price
- `deposit` (number, optional): Deposit amount
- `categoryId` (number, required): Category ID
- `merchantId` (number, optional): Merchant ID (auto-filled based on user)
- `images` (File[], optional): Product images (max 5MB each, jpg/png/webp)

**Response (201 Created):**
```json
{
    "success": true,
  "code": "PRODUCT_CREATED_SUCCESS",
  "message": "Product created successfully",
  "data": {
            "id": 123,
    "name": "New Product",
    "description": "Product description",
    "barcode": "987654321",
    "totalStock": 5,
    "rentPrice": 20.00,
    "salePrice": 100.00,
    "deposit": 30.00,
    "categoryId": 456,
    "merchantId": 789,
            "isActive": true,
    "images": ["image1.jpg"],
    "createdAt": "2024-01-01T00:00:00Z"
        }
}
```

**Error Responses:**

- **403 Forbidden** - Plan limit exceeded:
```json
{
  "success": false,
  "code": "PLAN_LIMIT_EXCEEDED",
  "message": "Plan limit exceeded for products"
}
```

---

### 5. Update Product

**PUT** `/api/products/[id]`

Update an existing product. Requires ADMIN, MERCHANT, or OUTLET_ADMIN role.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: multipart/form-data
X-Client-Platform: mobile
```

**Path Parameters:**
- `id` (number): Product ID

**Request Body (Form Data):**
Same as Create Product, but all fields are optional (partial update).

**Response (200 OK):**
```json
{
    "success": true,
  "code": "PRODUCT_UPDATED_SUCCESS",
  "message": "Product updated successfully",
    "data": {
                "id": 123,
    "name": "Updated Product Name",
    // ... updated product data
    }
}
```

---

## Order Management APIs

### 1. Get Orders

**GET** `/api/orders`

Get orders with filtering, search, and pagination.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Query Parameters:**
- `orderType` (string, optional): Filter by order type (RENT, SALE)
- `status` (string, optional): Filter by status (RESERVED, PICKUPED, RETURNED, COMPLETED, CANCELLED)
- `outletId` (number, optional): Filter by outlet ID
- `customerId` (number, optional): Filter by customer ID
- `productId` (number, optional): Filter by product ID
- `startDate` (string, optional): Start date filter (ISO 8601)
- `endDate` (string, optional): End date filter (ISO 8601)
- `search` or `q` (string, optional): Search query (searches order number, customer name, customer phone)
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `sortBy` (string, optional): Field to sort by (createdAt, orderNumber, totalAmount)
- `sortOrder` (string, optional): Sort order (asc, desc, default: desc)

**Example Request:**
```
GET /api/orders?orderType=RENT&status=PICKUPED&outletId=1&page=1&limit=20
```

**Response (200 OK):**
```json
{
    "success": true,
  "code": "ORDERS_FOUND",
  "message": "Orders retrieved successfully",
    "data": {
        "orders": [
            {
                "id": 123,
                "orderNumber": "ORD-001-0001",
                "orderType": "RENT",
                "status": "RESERVED",
                "totalAmount": 100.00,
                "depositAmount": 50.00,
        "securityDeposit": 0,
        "damageFee": 0,
        "lateFee": 0,
                "pickupPlanAt": "2024-01-15T10:00:00Z",
                "returnPlanAt": "2024-01-20T18:00:00Z",
        "pickedUpAt": null,
        "returnedAt": null,
        "rentalDuration": 5,
        "isReadyToDeliver": false,
        "notes": null,
        "pickupNotes": null,
        "returnNotes": null,
                "createdAt": "2024-01-10T08:00:00Z",
        "updatedAt": "2024-01-10T08:00:00Z",
                "outletId": 456,
                "customerId": 789,
                "createdById": 101,
                "customer": {
                    "id": 789,
                    "firstName": "John",
                    "lastName": "Doe",
          "phone": "+1234567890",
          "email": "john@example.com"
        },
        "outlet": {
          "id": 456,
          "name": "Main Store"
                },
                "orderItems": [
                    {
                        "id": 201,
                        "productId": 301,
                        "productName": "Drill Machine",
            "productBarcode": "123456789",
                        "quantity": 1,
                        "unitPrice": 25.00,
                        "totalPrice": 25.00,
            "deposit": 50.00,
            "productImages": ["image1.jpg"]
                    }
                ]
            }
        ],
        "total": 200,
        "page": 1,
        "limit": 20,
    "hasMore": true,
    "totalPages": 10
    }
}
```

**Error Responses:**

- **400 Bad Request** - Validation error:
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "error": {
    "fieldErrors": {
      "orderType": ["Invalid order type"]
    }
  }
}
```

---

### 2. Create Order

**POST** `/api/orders`

Create a new order. Requires ADMIN, MERCHANT, or OUTLET_ADMIN role.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
X-Client-Platform: mobile
```

**Request Body:**
```json
{
    "orderType": "RENT",
    "outletId": 456,
    "customerId": 789,
    "totalAmount": 100.00,
    "depositAmount": 50.00,
  "securityDeposit": 0,
  "damageFee": 0,
  "lateFee": 0,
    "pickupPlanAt": "2024-01-15T10:00:00Z",
    "returnPlanAt": "2024-01-20T18:00:00Z",
  "isReadyToDeliver": false,
  "notes": "Customer requested early pickup",
  "pickupNotes": null,
  "returnNotes": null,
  "discountType": null,
  "discountValue": 0,
  "discountAmount": 0,
  "collateralType": null,
  "collateralDetails": null,
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

**Response (201 Created):**
```json
{
  "success": true,
  "code": "ORDER_CREATED_SUCCESS",
  "message": "Order created successfully",
  "data": {
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
}
```

**Important Notes:**
- **SALE orders** automatically get status `COMPLETED`
- **RENT orders** automatically get status `RESERVED`
- Order number is auto-generated (6-digit format: `000001`, `000002`, etc.)
- `rentalDuration` is automatically calculated based on `pickupPlanAt` and `returnPlanAt` dates

**Error Responses:**

- **403 Forbidden** - Plan limit exceeded:
```json
{
  "success": false,
  "code": "PLAN_LIMIT_EXCEEDED",
  "message": "Plan limit exceeded for orders"
}
```

- **400 Bad Request** - Product not available:
```json
{
  "success": false,
  "code": "PRODUCT_NOT_AVAILABLE",
  "message": "Product is not available in sufficient quantity"
}
```

---

### 3. Get Order by ID

**GET** `/api/orders/[orderId]`

Get detailed order information by ID.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Path Parameters:**
- `orderId` (number): Order ID

**Example Request:**
```
GET /api/orders/123
```

**Response (200 OK):**
```json
{
    "success": true,
  "code": "ORDER_RETRIEVED_SUCCESS",
  "message": "Order retrieved successfully",
  "data": {
            "id": 123,
    "orderNumber": "ORD-001-0001",
    "orderType": "RENT",
    "status": "RESERVED",
    "totalAmount": 100.00,
    "depositAmount": 50.00,
    "pickupPlanAt": "2024-01-15T10:00:00Z",
    "returnPlanAt": "2024-01-20T18:00:00Z",
    "pickedUpAt": null,
    "returnedAt": null,
    "createdAt": "2024-01-10T08:00:00Z",
    "updatedAt": "2024-01-10T08:00:00Z",
    "outletId": 456,
    "customerId": 789,
    "createdById": 101,
    "customer": {
      "id": 789,
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "email": "john@example.com"
    },
    "outlet": {
      "id": 456,
      "name": "Main Store"
    },
    "orderItems": [
      {
        "id": 201,
        "productId": 301,
        "productName": "Drill Machine",
        "productBarcode": "123456789",
        "quantity": 1,
        "unitPrice": 25.00,
        "totalPrice": 25.00,
        "deposit": 50.00,
        "productImages": ["image1.jpg"]
      }
    ]
  }
}
```

---

### 4. Get Order by Order Number

**GET** `/api/orders/by-number/[orderNumber]`

Get order by order number (supports both with and without "ORD-" prefix).

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Path Parameters:**
- `orderNumber` (string): Order number (e.g., "000001" or "ORD-001-0001")

**Example Requests:**
```
GET /api/orders/by-number/000001
GET /api/orders/by-number/ORD-001-0001
```

**Response (200 OK):**
Same format as Get Order by ID.

**Error Responses:**

- **404 Not Found**:
```json
{
  "success": false,
  "code": "ORDER_NOT_FOUND",
  "message": "Order not found"
}
```

---

### 5. Update Order Status

**PATCH** `/api/orders/[orderId]/status`

Update order status with optional notes and timestamps.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
X-Client-Platform: mobile
```

**Path Parameters:**
- `orderId` (number): Order ID

**Request Body:**
```json
{
  "status": "PICKUPED",
  "notes": "Customer picked up items",
  "pickupNotes": "Items in good condition",
  "returnNotes": null,
  "pickedUpAt": "2024-01-15T10:30:00Z",
  "returnedAt": null,
  "returnAmount": null,
  "collateralReturned": false,
  "collateralType": null,
  "collateralDetails": null
}
```

**Status Values:**
- `RESERVED`: Order is reserved (initial status for RENT orders)
- `PICKUPED`: Items have been picked up
- `RETURNED`: Items have been returned (RENT orders only)
- `COMPLETED`: Order is completed (SALE orders only)
- `CANCELLED`: Order is cancelled

**Response (200 OK):**
```json
{
    "success": true,
  "code": "ORDER_STATUS_UPDATED_SUCCESS",
  "message": "Order status updated to PICKUPED successfully",
    "data": {
    "id": 123,
    "orderNumber": "ORD-001-0001",
    "status": "PICKUPED",
    "pickedUpAt": "2024-01-15T10:30:00Z",
    // ... updated order data
    }
}
```

**Important Notes:**
- When status is set to `PICKUPED`, `pickedUpAt` is automatically set to current time if not provided
- When status is set to `RETURNED`, `returnedAt` is automatically set to current time if not provided
- For RETURNED status, return amount is automatically calculated (deposit + security deposit)

**Error Responses:**

- **400 Bad Request** - Invalid status:
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "error": {
    "fieldErrors": {
      "status": ["Invalid status value"]
    }
  }
}
```

---

## Customer Management APIs

### 1. Get Customers

**GET** `/api/customers`

Get customers with filtering, search, and pagination.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Query Parameters:**
- `search` or `q` (string, optional): Search query (searches first name, last name, phone, email)
- `merchantId` (number, optional): Filter by merchant ID (ADMIN only)
- `outletId` (number, optional): Filter by outlet ID
- `isActive` (boolean, optional): Filter by active status
- `city` (string, optional): Filter by city
- `state` (string, optional): Filter by state
- `country` (string, optional): Filter by country
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Example Request:**
```
GET /api/customers?search=john&isActive=true&page=1&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "code": "CUSTOMERS_FOUND",
  "message": "Customers retrieved successfully",
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
        "state": "NY",
        "zipCode": "10001",
        "country": "US",
        "isActive": true,
        "merchantId": 456,
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20,
    "hasMore": true,
    "totalPages": 3
  }
}
```

---

### 2. Create Customer

**POST** `/api/customers`

Create a new customer.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
X-Client-Platform: mobile
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "address": "456 Oak Ave",
  "city": "Boston",
  "state": "MA",
  "zipCode": "02101",
  "country": "US",
  "merchantId": 456
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "code": "CUSTOMER_CREATED_SUCCESS",
  "message": "Customer created successfully",
  "data": {
    "id": 123,
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane@example.com",
    "phone": "+1234567890",
    "address": "456 Oak Ave",
    "city": "Boston",
    "state": "MA",
    "zipCode": "02101",
    "country": "US",
    "isActive": true,
    "merchantId": 456,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

**Error Responses:**

- **409 Conflict** - Duplicate customer:
```json
{
  "success": false,
  "code": "CUSTOMER_DUPLICATE",
  "message": "Customer with this phone number already exists"
}
```

---

### 3. Get Customer by ID

**GET** `/api/customers/[id]`

Get detailed customer information by ID.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Path Parameters:**
- `id` (number): Customer ID

**Example Request:**
```
GET /api/customers/123
```

**Response (200 OK):**
```json
{
    "success": true,
  "code": "CUSTOMER_RETRIEVED_SUCCESS",
  "message": "Customer retrieved successfully",
    "data": {
    "id": 123,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US",
    "isActive": true,
    "merchantId": 456,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
    }
}
```

---

### 4. Update Customer

**PUT** `/api/customers/[id]`

Update an existing customer.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
X-Client-Platform: mobile
```

**Path Parameters:**
- `id` (number): Customer ID

**Request Body:**
Same as Create Customer, but all fields are optional (partial update).

**Response (200 OK):**
```json
{
  "success": true,
  "code": "CUSTOMER_UPDATED_SUCCESS",
  "message": "Customer updated successfully",
  "data": {
    "id": 123,
    "firstName": "Updated Name",
    // ... updated customer data
  }
}
```

---

### 5. Get Customer Orders

**GET** `/api/customers/[id]/orders`

Get all orders for a specific customer.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Path Parameters:**
- `id` (number): Customer ID

**Query Parameters:**
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)

**Example Request:**
```
GET /api/customers/123/orders?page=1&limit=20
```

**Response (200 OK):**
```json
{
  "success": true,
  "code": "CUSTOMER_ORDERS_FOUND",
  "message": "Customer orders retrieved successfully",
  "data": {
    "orders": [
      {
        "id": 456,
        "orderNumber": "ORD-001-0001",
        "orderType": "RENT",
        "status": "PICKUPED",
        "totalAmount": 100.00,
        "depositAmount": 50.00,
        "pickupPlanAt": "2024-01-15T10:00:00Z",
        "returnPlanAt": "2024-01-20T18:00:00Z",
        "createdAt": "2024-01-10T08:00:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 20,
    "hasMore": false
  }
}
```

**Note:** Results are automatically filtered based on user role:
- **OUTLET_ADMIN/OUTLET_STAFF**: Only see orders from their outlet
- **MERCHANT**: See orders from all their outlets
- **ADMIN**: See all orders

---

## Category Management APIs

### 1. Get Categories

**GET** `/api/categories`

Get categories. Returns simple array if no query parameters, or paginated structure if query parameters are provided.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Query Parameters (Optional):**
- `search` or `q` (string, optional): Search query
- `merchantId` (number, optional): Filter by merchant ID (ADMIN only)
- `isActive` (boolean, optional): Filter by active status
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page
- `sortBy` (string, optional): Field to sort by
- `sortOrder` (string, optional): Sort order (asc, desc)

**Example Request (Simple List):**
```
GET /api/categories
```

**Response (200 OK) - Simple List:**
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
      "merchantId": 456,
      "createdAt": "2024-01-01T00:00:00Z"
    }
        ]
    }
```

**Example Request (With Pagination):**
```
GET /api/categories?search=tool&page=1&limit=20
```

**Response (200 OK) - With Pagination:**
```json
{
  "success": true,
  "code": "CATEGORIES_FOUND",
  "message": "Categories retrieved successfully",
  "data": {
    "categories": [
      {
        "id": 123,
        "name": "Tools",
        "description": "Power tools and hand tools",
        "isActive": true,
        "isDefault": false,
        "merchantId": 456,
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 20,
    "hasMore": false,
    "totalPages": 1
  }
}
```

---

### 2. Get Category by ID

**GET** `/api/categories/[id]`

Get detailed category information by ID.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Path Parameters:**
- `id` (number): Category ID

**Response (200 OK):**
```json
{
  "success": true,
  "code": "CATEGORY_RETRIEVED_SUCCESS",
  "message": "Category retrieved successfully",
  "data": {
    "id": 123,
    "name": "Tools",
    "description": "Power tools and hand tools",
    "isActive": true,
    "isDefault": false,
    "merchantId": 456,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
    }
}
```

---

## User Profile APIs

### 1. Get User Profile

**GET** `/api/users/profile`

Get current authenticated user's profile with complete merchant and outlet information.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "OUTLET_ADMIN",
    "isActive": true,
    "emailVerified": true,
    "emailVerifiedAt": "2024-01-01T00:00:00Z",
    "merchantId": 456,
    "outletId": 789,
    "merchant": {
      "id": 456,
      "name": "Merchant Name",
      "email": "merchant@example.com",
      "phone": "+1234567890",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "US",
      "businessType": "EQUIPMENT",
      "pricingType": "DAILY",
      "taxId": "TAX123",
      "website": "https://example.com",
      "description": "Merchant description",
      "isActive": true,
      "planId": 1,
      "subscriptionStatus": "ACTIVE",
      "totalRevenue": 10000.00,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastActiveAt": "2024-01-10T00:00:00Z"
    },
    "outlet": {
      "id": 789,
      "name": "Main Store",
      "address": "123 Main St",
      "phone": "+1234567890",
      "description": "Main store location",
      "isActive": true,
      "isDefault": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "merchant": {
        "id": 456,
        "name": "Merchant Name"
      }
    }
    }
}
```

**Error Responses:**

- **404 Not Found**:
```json
{
  "success": false,
  "code": "USER_NOT_FOUND",
  "message": "User not found"
}
```

---

### 2. Update User Profile

**PUT** `/api/users/profile`

Update current user's profile. Only firstName, lastName, and phone can be updated (email updates are disabled for security).

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
X-Client-Platform: mobile
```

**Request Body:**
```json
{
  "firstName": "Updated First Name",
  "lastName": "Updated Last Name",
  "phone": "+1234567890"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "code": "PROFILE_UPDATED_SUCCESS",
  "message": "Profile updated successfully",
  "data": {
    "id": 123,
    "email": "user@example.com",
    "firstName": "Updated First Name",
    "lastName": "Updated Last Name",
    "phone": "+1234567890",
    "role": "OUTLET_ADMIN",
    "merchantId": 456,
    "outletId": 789,
    "merchant": {
      "id": 456,
      "name": "Merchant Name"
    },
    "outlet": {
      "id": 789,
      "name": "Main Store"
    }
  }
}
```

**Error Responses:**

- **400 Bad Request** - Phone already exists:
```json
{
  "success": false,
  "code": "PHONE_ALREADY_EXISTS",
  "message": "Phone number already exists in your organization"
}
```

---

## Analytics APIs

### 1. Dashboard Analytics

**GET** `/api/analytics/dashboard`

Get comprehensive dashboard analytics with overview metrics, order status breakdown, and today's orders. Results are automatically filtered based on user role.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Query Parameters:**
- `period` (string, optional): Time period filter. Default: "today"
  - `today`: Filter orders created today
  - Other values: No date filtering (all orders)

**Example Request:**
```
GET /api/analytics/dashboard?period=today
```

**Response (200 OK):**
```json
{
  "overview": {
    "totalOrders": 150,
    "totalRevenue": 15000.00,
    "activeOrders": 25,
    "completionRate": "83.3"
  },
  "orderStatusCounts": {
    "reserved": 10,
    "pickup": 15,
    "completed": 100,
    "cancelled": 5,
    "returned": 20
  },
  "todayOrders": [
    {
      "id": 123,
      "orderNumber": "ORD-001-0001",
      "status": "PICKUPED",
      "totalAmount": 100.00,
      "customerName": "John Doe",
      "outletName": "Main Store",
      "createdAt": "2024-01-10T08:00:00Z",
      "pickupPlanAt": "2024-01-15T10:00:00Z",
      "returnPlanAt": "2024-01-20T18:00:00Z",
      "productNames": "Drill Machine, Hammer"
    }
  ]
}
```

**Response Headers:**
- `ETag`: For caching (304 Not Modified if unchanged)
- `Cache-Control`: `private, max-age=60`

**Role-Based Filtering:**
- **OUTLET_ADMIN/OUTLET_STAFF**: See analytics for their outlet only
- **MERCHANT**: See analytics for all their outlets
- **ADMIN**: See system-wide analytics

**Note:** Revenue calculation:
- **SALE orders**: Count `totalAmount` on creation date
- **RENT RESERVED**: Count `depositAmount` on creation date
- **RENT PICKUPED**: Count `(totalAmount - depositAmount + securityDeposit)` on pickup date
- **RENT RETURNED**: Count `-(securityDeposit - damageFee)` on return date (negative = refund)

---

### 2. Order Statistics

**GET** `/api/orders/statistics`

Get optimized order statistics with aggregation. Results are automatically filtered based on user role.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Query Parameters:**
- `startDate` (string, optional): Start date filter (ISO 8601 format)
- `endDate` (string, optional): End date filter (ISO 8601 format)

**Example Request:**
```
GET /api/orders/statistics?startDate=2024-01-01&endDate=2024-01-31
```

**Response (200 OK):**
```json
{
  "success": true,
  "code": "STATISTICS_FOUND",
  "message": "Order statistics retrieved successfully",
  "data": {
    "totalOrders": 500,
    "totalRevenue": 50000.00,
    "statusBreakdown": {
      "RESERVED": 50,
      "PICKUPED": 100,
      "RETURNED": 200,
      "COMPLETED": 150,
      "CANCELLED": 0
    }
  }
}
```

**Role-Based Filtering:**
- **OUTLET_ADMIN/OUTLET_STAFF**: See statistics for their outlet only
- **MERCHANT**: See statistics for all their outlets
- **ADMIN**: See system-wide statistics

---

### 3. Today's Metrics

**GET** `/api/analytics/today-metrics`

Get today's operational metrics including orders, revenue, stock, and overdue items.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Query Parameters:** None (always returns today's data)

**Example Request:**
```
GET /api/analytics/today-metrics
```

**Response (200 OK):**
```json
{
  "success": true,
  "code": "TODAY_METRICS_SUCCESS",
  "message": "Today metrics retrieved successfully",
  "data": {
    "totalOrders": 25,
    "activeRentals": 10,
    "completedOrders": 15,
    "totalRevenue": 2500.00,
    "overdueItems": 2,
    "totalStock": 500,
    "availableStock": 450,
    "rentingStock": 50
  }
}
```

**Role-Based Filtering:**
- **OUTLET_ADMIN/OUTLET_STAFF**: See metrics for their outlet only
- **MERCHANT**: See metrics for all their outlets
- **ADMIN**: See system-wide metrics

---

### 4. Top Customers

**GET** `/api/analytics/top-customers`

Get top-performing customers by total spending. Results are automatically filtered based on user role.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Query Parameters:**
- `startDate` (string, optional): Start date filter (ISO 8601 format). Default: last 30 days
- `endDate` (string, optional): End date filter (ISO 8601 format). Default: today

**Example Request:**
```
GET /api/analytics/top-customers?startDate=2024-01-01&endDate=2024-01-31
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "location": "123 Main St",
      "orderCount": 25,
      "rentalCount": 20,
      "saleCount": 5,
      "totalSpent": 5000.00
    },
    {
      "id": 456,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+0987654321",
      "location": "456 Oak Ave",
      "orderCount": 15,
      "rentalCount": 12,
      "saleCount": 3,
      "totalSpent": 3000.00
    }
  ],
  "userRole": "MERCHANT"
}
```

**Note:** 
- `totalSpent` is hidden for `OUTLET_STAFF` role (returns `null`)
- Results are sorted by `totalSpent` in descending order
- Maximum 10 customers returned

**Response Headers:**
- `ETag`: For caching (304 Not Modified if unchanged)
- `Cache-Control`: `private, max-age=60`

**Role-Based Filtering:**
- **OUTLET_ADMIN/OUTLET_STAFF**: See top customers for their outlet only
- **MERCHANT**: See top customers for all their outlets
- **ADMIN**: See system-wide top customers

---

### 5. Top Products

**GET** `/api/analytics/top-products`

Get top-performing products by total revenue. Results are automatically filtered based on user role.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Query Parameters:**
- `startDate` (string, optional): Start date filter (ISO 8601 format)
- `endDate` (string, optional): End date filter (ISO 8601 format)
- `limit` (number, optional): Number of products to return. Default: 10

**Example Request:**
```
GET /api/analytics/top-products?startDate=2024-01-01&endDate=2024-01-31&limit=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "code": "TOP_PRODUCTS_SUCCESS",
  "message": "Top products retrieved successfully",
  "data": [
    {
      "id": 123,
      "name": "Drill Machine",
      "rentPrice": 25.00,
      "category": "Tools",
      "rentalCount": 50,
      "totalRevenue": 5000.00,
      "image": "https://example.com/image1.jpg"
    },
    {
      "id": 456,
      "name": "Hammer",
      "rentPrice": 10.00,
      "category": "Tools",
      "rentalCount": 100,
      "totalRevenue": 3000.00,
      "image": "https://example.com/image2.jpg"
    }
  ]
}
```

**Note:** 
- Results are sorted by `totalRevenue` in descending order
- `rentalCount` includes all orders (both RENT and SALE) for the product
- `image` is the first image from product's images array

**Role-Based Filtering:**
- **OUTLET_ADMIN/OUTLET_STAFF**: See top products for their outlet only
- **MERCHANT**: See top products for all their outlets
- **ADMIN**: See system-wide top products

---

### 6. Income Analytics

**GET** `/api/analytics/income`

Get income analytics with real income, future income, and order counts grouped by time period. Supports outlet comparison for merchants.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Query Parameters:**
- `startDate` (string, required): Start date (ISO 8601 format)
- `endDate` (string, required): End date (ISO 8601 format)
- `groupBy` (string, optional): Grouping type. Default: "month"
  - `month`: Group by month (format: "MM/YY")
  - `day`: Group by day (format: "DD/MM/YY")
- `outletIds` (string, optional): Comma-separated outlet IDs for comparison (MERCHANT only)

**Example Request (Monthly):**
```
GET /api/analytics/income?startDate=2024-01-01&endDate=2024-12-31&groupBy=month
```

**Example Request (Daily with Outlet Comparison):**
```
GET /api/analytics/income?startDate=2024-01-01&endDate=2024-01-31&groupBy=day&outletIds=1,2,3
```

**Response (200 OK) - Single Outlet/Aggregated:**
```json
{
  "success": true,
  "data": [
    {
      "month": "01/24",
      "year": 2024,
      "realIncome": 10000.00,
      "futureIncome": 5000.00,
      "orderCount": 50
    },
    {
      "month": "02/24",
      "year": 2024,
      "realIncome": 12000.00,
      "futureIncome": 6000.00,
      "orderCount": 60
    }
  ]
}
```

**Response (200 OK) - Outlet Comparison:**
```json
{
  "success": true,
  "data": [
    {
      "month": "01/24",
      "year": 2024,
      "outletId": 1,
      "outletName": "Main Store",
      "realIncome": 5000.00,
      "futureIncome": 2500.00,
      "orderCount": 25
    },
    {
      "month": "01/24",
      "year": 2024,
      "outletId": 2,
      "outletName": "Branch Store",
      "realIncome": 3000.00,
      "futureIncome": 1500.00,
      "orderCount": 15
    }
  ]
}
```

**Income Calculation:**
- **Real Income:**
  - **SALE orders**: `totalAmount` on `createdAt` date
  - **RENT RESERVED**: `depositAmount` on `createdAt` date
  - **RENT PICKUPED**: `(totalAmount - depositAmount + securityDeposit)` on `pickedUpAt` date
  - **RENT RETURNED**: `-(securityDeposit - damageFee)` on `returnedAt` date (negative = refund)
- **Future Income:**
  - **RENT RESERVED**: `(totalAmount - depositAmount)` for orders with `pickupPlanAt` in the period

**Response Headers:**
- `ETag`: For caching (304 Not Modified if unchanged)
- `Cache-Control`: `private, max-age=60`

**Role-Based Filtering:**
- **OUTLET_ADMIN/OUTLET_STAFF**: See income for their outlet only
- **MERCHANT**: See income for all outlets (or specific outlets if `outletIds` provided)
- **ADMIN**: See system-wide income

**Error Responses:**
- **400 Bad Request** - Missing dates:
```json
{
  "success": false,
  "error": "startDate and endDate are required"
}
```

---

### 7. Growth Metrics

**GET** `/api/analytics/growth-metrics`

Get growth metrics comparing current period with previous period (orders and revenue).

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Query Parameters:**
- `startDate` (string, optional): Start date of current period (ISO 8601 format). Default: current month
- `endDate` (string, optional): End date of current period (ISO 8601 format). Default: today

**Example Request:**
```
GET /api/analytics/growth-metrics?startDate=2024-01-01&endDate=2024-01-31
```

**Response (200 OK):**
```json
{
  "success": true,
  "code": "GROWTH_METRICS_SUCCESS",
  "message": "Growth metrics retrieved successfully",
  "data": {
    "orders": {
      "current": 150,
      "previous": 120,
      "growth": 25.00
    },
    "revenue": {
      "current": 15000.00,
      "previous": 12000.00,
      "growth": 25.00
    }
  }
}
```

**Growth Calculation:**
- Growth percentage = `((current - previous) / previous) * 100`
- Positive values indicate growth, negative values indicate decline

**Role-Based Filtering:**
- **OUTLET_ADMIN/OUTLET_STAFF**: See growth metrics for their outlet only
- **MERCHANT**: See growth metrics for all their outlets
- **ADMIN**: See system-wide growth metrics

---

### 8. Recent Orders

**GET** `/api/analytics/recent-orders`

Get recent orders with customer and product details. Results are automatically filtered based on user role.

**Request Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
X-Client-Platform: mobile
```

**Query Parameters:**
- `startDate` (string, optional): Start date filter (ISO 8601 format). Default: last 30 days
- `endDate` (string, optional): End date filter (ISO 8601 format). Default: today

**Example Request:**
```
GET /api/analytics/recent-orders?startDate=2024-01-01&endDate=2024-01-31
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "orderNumber": "ORD-001-0001",
      "customerName": "John Doe",
      "customerPhone": "+1234567890",
      "productNames": "Drill Machine, Hammer",
      "productImage": "https://example.com/image1.jpg",
      "totalAmount": 100.00,
      "status": "PICKUPED",
      "orderType": "RENT",
      "createdAt": "2024-01-10T08:00:00Z",
      "createdBy": "",
      "pickupPlanAt": "2024-01-15T10:00:00Z",
      "returnPlanAt": "2024-01-20T18:00:00Z"
    }
  ]
}
```

**Note:**
- Maximum 20 orders returned
- Results are sorted by `createdAt` in descending order
- Excludes CANCELLED orders
- `productImage` is the first image from the first product in the order

**Response Headers:**
- `ETag`: For caching (304 Not Modified if unchanged)
- `Cache-Control`: `private, max-age=60`

**Role-Based Filtering:**
- **OUTLET_ADMIN/OUTLET_STAFF**: See recent orders for their outlet only
- **MERCHANT**: See recent orders for all their outlets
- **ADMIN**: See system-wide recent orders

---

## Error Handling

### Standard Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "error": "Additional error details (optional)"
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | Wrong email/password | 401 |
| `ACCESS_TOKEN_REQUIRED` | Missing authorization header | 401 |
| `INVALID_TOKEN` | Invalid or expired token | 401 |
| `EMAIL_NOT_VERIFIED` | Email verification required | 403 |
| `ACCOUNT_DEACTIVATED` | Account has been deactivated | 403 |
| `INSUFFICIENT_PERMISSIONS` | User lacks required role | 403 |
| `PLATFORM_ACCESS_DENIED` | Platform access denied (check headers) | 403 |
| `PLAN_LIMIT_EXCEEDED` | Subscription limit reached | 403 |
| `ENTITY_NOT_FOUND` | Resource not found | 404 |
| `USER_NOT_FOUND` | User not found | 404 |
| `PRODUCT_NOT_FOUND` | Product not found | 404 |
| `ORDER_NOT_FOUND` | Order not found | 404 |
| `CUSTOMER_NOT_FOUND` | Customer not found | 404 |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `EMAIL_ALREADY_EXISTS` | Email already registered | 409 |
| `CUSTOMER_DUPLICATE` | Customer with phone already exists | 409 |
| `MERCHANT_DUPLICATE` | Merchant already exists | 409 |
| `INTERNAL_SERVER_ERROR` | Server error | 500 |

### Validation Error Format

When validation fails, the error response includes field-specific errors:

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "error": {
    "fieldErrors": {
      "email": ["Invalid email format"],
      "password": ["Password must be at least 6 characters"],
      "phone": ["Phone number is required"]
    }
  }
}
```

---

## Role-Based Access Control

### User Roles

The system supports four user roles:

1. **ADMIN**: System administrator with full system-wide access
2. **MERCHANT**: Business owner with organization-wide access
3. **OUTLET_ADMIN**: Outlet manager with full outlet access
4. **OUTLET_STAFF**: Outlet employee with limited outlet access

### Access Matrix

| Feature | ADMIN | MERCHANT | OUTLET_ADMIN | OUTLET_STAFF |
|---------|-------|----------|--------------|--------------|
| **Users** | ✓ All | ✓ Own Org | ✓ Own Outlet | ✗ |
| **Merchants** | ✓ All | ✗ | ✗ | ✗ |
| **Outlets** | ✓ All | ✓ Own Org | ✓ Own Outlet | ✗ |
| **Products** | ✓ All | ✓ Own Org | ✓ Own Outlet | ✓ View Only |
| **Orders** | ✓ All | ✓ Own Org | ✓ Own Outlet | ✓ Own Outlet |
| **Customers** | ✓ All | ✓ Own Org | ✓ Own Outlet | ✓ Own Outlet |
| **Analytics** | ✓ All | ✓ Own Org | ✓ Own Outlet | ✗ |
| **Categories** | ✓ All | ✓ Own Org | ✓ Own Org | ✓ View Only |

### Role-Based Data Filtering

**Important:** All data filtering is performed automatically at the backend level based on user role. The frontend should NOT implement role-based filtering for security reasons.

**Examples:**
- **OUTLET_STAFF** users automatically see only orders from their assigned outlet
- **MERCHANT** users automatically see orders from all their outlets
- **ADMIN** users see all orders across all merchants

**Security Note:** Never implement role-based filtering on the frontend. Always rely on backend filtering for security.

---

## Best Practices

### 1. Authentication
- Always include `Authorization: Bearer <token>` header for authenticated endpoints
- Store JWT token securely (use secure storage, never in localStorage for sensitive apps)
- Handle token expiration and refresh appropriately
- Include `X-Client-Platform: mobile` header for all requests

### 2. Error Handling
- Always check `success` field in response
- Handle specific error codes appropriately
- Show user-friendly error messages
- Log errors for debugging

### 3. Pagination
- Always implement pagination for list endpoints
- Use `hasMore` field to determine if more data is available
- Implement infinite scroll or "Load More" functionality

### 4. Data Filtering
- Use query parameters for filtering
- Implement search functionality using `search` or `q` parameter
- Apply filters on the backend, not frontend

### 5. Request Optimization
- Use appropriate `limit` values (default: 20)
- Implement caching for frequently accessed data
- Use pagination to avoid loading large datasets

### 6. Security
- Never expose sensitive data in URLs
- Always use HTTPS in production
- Validate all user inputs
- Never trust client-side validation alone

---

## Mobile-Specific Considerations

### Platform Access Control
- Basic Plan: Mobile access only (`X-Client-Platform: mobile`)
- Professional/Enterprise Plans: Both mobile and web access
- Always include `X-Client-Platform: mobile` header

### Offline Support
- Implement local caching for frequently accessed data
- Queue API requests when offline
- Sync data when connection is restored

### Performance
- Use pagination to limit data transfer
- Implement image lazy loading
- Cache product and customer data locally
- Use appropriate image sizes for mobile

### User Experience
- Show loading states during API calls
- Implement pull-to-refresh for lists
- Handle network errors gracefully
- Provide offline indicators

---

This documentation provides complete API reference for mobile app integration with detailed request/response formats, error handling, and best practices.
