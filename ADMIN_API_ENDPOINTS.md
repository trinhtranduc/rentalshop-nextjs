# Admin API Endpoints - Testing Guide

## Tổng quan

Tất cả các Admin API endpoints đã được implement và sẵn sàng sử dụng. Tất cả endpoints yêu cầu **ADMIN role** authentication.

## Base URL

```
/api/admin/tenants
```

## Authentication

Tất cả endpoints yêu cầu:
- **Header**: `Authorization: Bearer <admin_token>`
- **Role**: `ADMIN`

## Endpoints

### 1. List All Tenants

**GET** `/api/admin/tenants`

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 10)
- `q` hoặc `search` - Search tenants
- `status` - Filter by status (active, inactive, suspended)
- `subscriptionStatus` - Filter by subscription status
- `planId` - Filter by plan ID
- `sortBy` (default: createdAt)
- `sortOrder` (asc, desc)

**Response**:
```json
{
  "success": true,
  "code": "TENANTS_FOUND",
  "data": {
    "tenants": [...],
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasMore": true
  }
}
```

---

### 2. Get Tenant by ID

**GET** `/api/admin/tenants/{tenantId}`

**Response**:
```json
{
  "success": true,
  "code": "TENANT_FOUND",
  "data": {
    "tenant": {
      "id": "tenant-id",
      "name": "Business Name",
      "email": "email@example.com",
      "subdomain": "business-subdomain",
      "status": "active",
      "subscriptionStatus": "active",
      "databaseUrl": "***masked***",
      "tenantUrl": "business-subdomain.anyrent.shop",
      ...
    }
  }
}
```

---

### 3. Update Tenant

**PUT** `/api/admin/tenants/{tenantId}`

**Request Body** (tất cả fields đều optional):
```json
{
  "name": "Updated Business Name",
  "email": "newemail@example.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001",
  "country": "USA",
  "taxId": "12-3456789",
  "businessType": "EQUIPMENT",
  "website": "https://example.com",
  "description": "Updated description",
  "status": "active",
  "subscriptionStatus": "active",
  "planId": 2,
  "currentPeriodStart": "2024-01-01T00:00:00Z",
  "currentPeriodEnd": "2024-02-01T00:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "code": "TENANT_UPDATED",
  "data": {
    "tenant": {
      "id": "tenant-id",
      "name": "Updated Business Name",
      ...
    }
  }
}
```

---

### 4. Get Tenant Products

**GET** `/api/admin/tenants/{tenantId}/products`

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 20)
- `q` hoặc `search` - Search by name, barcode
- `categoryId` - Filter by category
- `isActive` (default: true)
- `sortBy` (name, createdAt, price)
- `sortOrder` (asc, desc)

**Response**:
```json
{
  "success": true,
  "code": "PRODUCTS_FOUND",
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Product Name",
        "tenantId": "tenant-id",
        "tenantName": "Business Name",
        "tenantSubdomain": "business-subdomain",
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasMore": true
    },
    "tenant": {
      "id": "tenant-id",
      "name": "Business Name",
      "subdomain": "business-subdomain"
    }
  }
}
```

---

### 5. Get Tenant Orders

**GET** `/api/admin/tenants/{tenantId}/orders`

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 20)
- `status` - Filter by status (RESERVED, PICKUPED, RETURNED, COMPLETED, CANCELLED)
- `orderType` - Filter by type (RENT, SALE)
- `startDate` - Start date filter (ISO format)
- `endDate` - End date filter (ISO format)
- `q` hoặc `search` - Search by order number, customer name/phone
- `sortBy` (createdAt, orderNumber, totalAmount)
- `sortOrder` (asc, desc)

**Response**:
```json
{
  "success": true,
  "code": "ORDERS_FOUND",
  "data": {
    "items": [
      {
        "id": 1,
        "orderNumber": "ORD-001-0001",
        "tenantId": "tenant-id",
        "customer": {...},
        "outlet": {...},
        "orderItems": [...],
        ...
      }
    ],
    "pagination": {...},
    "tenant": {...}
  }
}
```

---

### 6. Get Tenant Users

**GET** `/api/admin/tenants/{tenantId}/users`

**Query Parameters**:
- `page` (default: 1)
- `limit` (default: 20)
- `role` - Filter by role (ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF)
- `isActive` (default: true)
- `outletId` - Filter by outlet
- `q` hoặc `search` - Search by name, email
- `sortBy` (firstName, lastName, email, createdAt)
- `sortOrder` (asc, desc)

**Response**:
```json
{
  "success": true,
  "code": "USERS_FOUND",
  "data": {
    "items": [
      {
        "id": 1,
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "role": "OUTLET_ADMIN",
        "tenantId": "tenant-id",
        "outlet": {...},
        ...
      }
    ],
    "pagination": {...},
    "tenant": {...}
  }
}
```

---

### 7. Get Tenant Subscription

**GET** `/api/admin/tenants/{tenantId}/subscription`

**Response**:
```json
{
  "success": true,
  "code": "SUBSCRIPTION_FOUND",
  "data": {
    "subscription": {
      "tenantId": "tenant-id",
      "tenantName": "Business Name",
      "subscriptionStatus": "active",
      "planId": 2,
      "currentPeriodStart": "2024-01-01T00:00:00Z",
      "currentPeriodEnd": "2024-02-01T00:00:00Z",
      "subscriptionDetails": {
        "id": 1,
        "status": "ACTIVE",
        "amount": 99.99,
        "plan": {...},
        "payments": [...]
      },
      "planDetails": {...}
    },
    "tenant": {...}
  }
}
```

---

### 8. Renew Tenant Subscription

**PUT** `/api/admin/tenants/{tenantId}/subscription/renew`

**Request Body**:
```json
{
  "months": 1,  // Optional, default based on plan interval
  "planId": 2   // Optional, upgrade/downgrade plan
}
```

**Response**:
```json
{
  "success": true,
  "code": "SUBSCRIPTION_RENEWED",
  "data": {
    "subscription": {
      "id": 1,
      "status": "ACTIVE",
      "currentPeriodStart": "2024-01-01T00:00:00Z",
      "currentPeriodEnd": "2024-03-01T00:00:00Z",
      "plan": {...},
      "renewalMonths": 2
    },
    "tenant": {
      "id": "tenant-id",
      "subscriptionStatus": "active",
      "currentPeriodEnd": "2024-03-01T00:00:00Z"
    }
  }
}
```

---

## Error Codes

- `TENANT_ID_REQUIRED` - Tenant ID không được cung cấp
- `TENANT_NOT_FOUND` - Tenant không tồn tại
- `TENANT_INACTIVE` - Tenant không active
- `TENANT_DB_ERROR` - Lỗi kết nối tenant database
- `SUBSCRIPTION_NOT_FOUND` - Subscription không tìm thấy
- `INVALID_RENEWAL_PERIOD` - Period renewal không hợp lệ (1-24 months)
- `VALIDATION_ERROR` - Dữ liệu validation không hợp lệ
- `NO_FIELDS_TO_UPDATE` - Không có field nào để update

## Testing với cURL

### 1. List Tenants
```bash
curl -X GET "http://localhost:3000/api/admin/tenants?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 2. Get Tenant
```bash
curl -X GET "http://localhost:3000/api/admin/tenants/TENANT_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 3. Update Tenant
```bash
curl -X PUT "http://localhost:3000/api/admin/tenants/TENANT_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "newemail@example.com"
  }'
```

### 4. Get Products
```bash
curl -X GET "http://localhost:3000/api/admin/tenants/TENANT_ID/products?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 5. Get Orders
```bash
curl -X GET "http://localhost:3000/api/admin/tenants/TENANT_ID/orders?status=ACTIVE&page=1" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 6. Get Users
```bash
curl -X GET "http://localhost:3000/api/admin/tenants/TENANT_ID/users?role=OUTLET_ADMIN" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 7. Get Subscription
```bash
curl -X GET "http://localhost:3000/api/admin/tenants/TENANT_ID/subscription" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 8. Renew Subscription
```bash
curl -X PUT "http://localhost:3000/api/admin/tenants/TENANT_ID/subscription/renew" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "months": 3
  }'
```

## Testing Checklist

- [ ] List all tenants với pagination
- [ ] Get tenant by ID (valid ID)
- [ ] Get tenant by ID (invalid ID) - should return 404
- [ ] Update tenant với một số fields
- [ ] Update tenant với tất cả fields
- [ ] Update tenant với invalid data - should return validation error
- [ ] Get products với pagination và filters
- [ ] Get orders với date range và status filter
- [ ] Get users với role filter
- [ ] Get subscription (combines Main DB + Tenant DB data)
- [ ] Renew subscription với custom months
- [ ] Renew subscription với plan upgrade
- [ ] Test với non-existent tenantId - should return 404
- [ ] Test với inactive tenant - should return appropriate error
- [ ] Test authentication - should return 401 without token
- [ ] Test authorization - should return 403 without ADMIN role

## Notes

- Tất cả responses đều follow format chuẩn với `ResponseBuilder`
- Database URL được mask trong responses để bảo mật
- Pagination được implement cho tất cả list endpoints
- Filtering và sorting được hỗ trợ đầy đủ
- Error handling đã được implement với proper error codes

