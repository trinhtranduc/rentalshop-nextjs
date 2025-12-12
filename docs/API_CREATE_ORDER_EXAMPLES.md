# API Tạo Order - Request & Response Examples

## Endpoint
```
POST /api/orders
```

## Authentication
Yêu cầu JWT token trong header:
```
Authorization: Bearer <your_jwt_token>
```

## Request Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <your_jwt_token>"
}
```

---

## 📋 Request Schema

### Required Fields
- `orderType`: `"RENT"` | `"SALE"` | `"RENT_TO_OWN"`
- `outletId`: `number` (ID của outlet)
- `totalAmount`: `number` (Tổng tiền)
- `orderItems`: `Array<OrderItem>` (Danh sách sản phẩm)

### Optional Fields
- `customerId`: `number` (ID khách hàng, nếu không có thì tạo order không có khách hàng)
- `pickupPlanAt`: `string` (ISO date string, bắt buộc cho RENT orders)
- `returnPlanAt`: `string` (ISO date string, bắt buộc cho RENT orders)
- `depositAmount`: `number` (Tiền cọc)
- `securityDeposit`: `number` (Tiền đặt cọc bảo đảm)
- `damageFee`: `number` (Phí hư hỏng)
- `lateFee`: `number` (Phí trễ)
- `discountType`: `"amount"` | `"percentage"` (Loại giảm giá)
- `discountValue`: `number` (Giá trị giảm giá)
- `discountAmount`: `number` (Số tiền giảm giá)
- `collateralType`: `string` (Loại tài sản thế chấp)
- `collateralDetails`: `string` (Chi tiết tài sản thế chấp)
- `notes`: `string` (Ghi chú)
- `pickupNotes`: `string` (Ghi chú khi lấy hàng)
- `isReadyToDeliver`: `boolean` (Sẵn sàng giao hàng)

### OrderItem Schema
```typescript
{
  productId: number;        // Required: ID sản phẩm
  quantity: number;          // Required: Số lượng (> 0)
  unitPrice: number;         // Required: Giá đơn vị (>= 0)
  totalPrice?: number;       // Optional: Tổng tiền (server sẽ tính nếu không có)
  deposit?: number;          // Optional: Tiền cọc đơn vị (>= 0, default: 0)
  notes?: string;            // Optional: Ghi chú cho item
}
```

---

## 📤 Request Examples

### Example 1: RENT Order (Đơn thuê)

```json
{
  "orderType": "RENT",
  "outletId": 1,
  "customerId": 123,
  "pickupPlanAt": "2025-01-15T08:00:00.000Z",
  "returnPlanAt": "2025-01-20T18:00:00.000Z",
  "totalAmount": 500000,
  "depositAmount": 200000,
  "securityDeposit": 100000,
  "discountType": "percentage",
  "discountValue": 10,
  "discountAmount": 50000,
  "notes": "Khách hàng VIP",
  "pickupNotes": "Giao hàng tại cửa hàng",
  "isReadyToDeliver": true,
  "orderItems": [
    {
      "productId": 456,
      "quantity": 2,
      "unitPrice": 250000,
      "totalPrice": 500000,
      "deposit": 100000,
      "notes": "Máy khoan Bosch"
    },
    {
      "productId": 789,
      "quantity": 1,
      "unitPrice": 300000,
      "totalPrice": 300000,
      "deposit": 150000,
      "notes": "Máy cắt gạch"
    }
  ]
}
```

### Example 2: SALE Order (Đơn bán)

```json
{
  "orderType": "SALE",
  "outletId": 1,
  "customerId": 456,
  "totalAmount": 1500000,
  "discountType": "amount",
  "discountValue": 100000,
  "discountAmount": 100000,
  "notes": "Khách hàng mua số lượng lớn",
  "orderItems": [
    {
      "productId": 111,
      "quantity": 3,
      "unitPrice": 500000,
      "totalPrice": 1500000,
      "deposit": 0,
      "notes": "Máy hút bụi công nghiệp"
    }
  ]
}
```

### Example 3: RENT Order (Không có khách hàng)

```json
{
  "orderType": "RENT",
  "outletId": 2,
  "pickupPlanAt": "2025-01-20T09:00:00.000Z",
  "returnPlanAt": "2025-01-25T17:00:00.000Z",
  "totalAmount": 800000,
  "depositAmount": 300000,
  "orderItems": [
    {
      "productId": 222,
      "quantity": 1,
      "unitPrice": 800000,
      "totalPrice": 800000,
      "deposit": 300000
    }
  ]
}
```

### Example 4: RENT Order với Collateral (Tài sản thế chấp)

```json
{
  "orderType": "RENT",
  "outletId": 1,
  "customerId": 789,
  "pickupPlanAt": "2025-01-18T10:00:00.000Z",
  "returnPlanAt": "2025-01-22T18:00:00.000Z",
  "totalAmount": 1200000,
  "depositAmount": 500000,
  "securityDeposit": 200000,
  "collateralType": "CMND",
  "collateralDetails": "CMND số 123456789",
  "orderItems": [
    {
      "productId": 333,
      "quantity": 1,
      "unitPrice": 1200000,
      "totalPrice": 1200000,
      "deposit": 500000
    }
  ]
}
```

---

## 📥 Response Examples

### Success Response (200/201)

```json
{
  "success": true,
  "data": {
    "id": 999,
    "orderNumber": "123456",
    "orderType": "RENT",
    "status": "RESERVED",
    "outletId": 1,
    "outletName": "Cửa hàng Hà Nội",
    "customerId": 123,
    "customerFirstName": "Nguyễn",
    "customerLastName": "Văn A",
    "customerName": "Nguyễn Văn A",
    "customerPhone": "0912345678",
    "customerEmail": "nguyenvana@example.com",
    "merchantId": null,
    "merchantName": null,
    "createdById": "clx123abc",
    "createdByName": "Trần Thị B",
    "totalAmount": 500000,
    "depositAmount": 200000,
    "securityDeposit": 100000,
    "damageFee": 0,
    "lateFee": 0,
    "discountType": "percentage",
    "discountValue": 10,
    "discountAmount": 50000,
    "pickupPlanAt": "2025-01-15T08:00:00.000Z",
    "returnPlanAt": "2025-01-20T18:00:00.000Z",
    "pickedUpAt": null,
    "returnedAt": null,
    "rentalDuration": 5,
    "isReadyToDeliver": true,
    "collateralType": null,
    "collateralDetails": null,
    "notes": "Khách hàng VIP",
    "pickupNotes": "Giao hàng tại cửa hàng",
    "returnNotes": null,
    "damageNotes": null,
    "createdAt": "2025-01-10T10:30:00.000Z",
    "updatedAt": "2025-01-10T10:30:00.000Z",
    "orderItems": [
      {
        "id": 1001,
        "productId": 456,
        "productName": "Máy khoan Bosch",
        "productBarcode": "BOSCH001",
        "productImages": [
          "https://example.com/images/product-456-1.jpg",
          "https://example.com/images/product-456-2.jpg"
        ],
        "quantity": 2,
        "unitPrice": 250000,
        "totalPrice": 500000,
        "deposit": 100000,
        "notes": "Máy khoan Bosch",
        "rentalDays": 5
      },
      {
        "id": 1002,
        "productId": 789,
        "productName": "Máy cắt gạch",
        "productBarcode": "CUTTER001",
        "productImages": [
          "https://example.com/images/product-789-1.jpg"
        ],
        "quantity": 1,
        "unitPrice": 300000,
        "totalPrice": 300000,
        "deposit": 150000,
        "notes": "Máy cắt gạch",
        "rentalDays": 5
      }
    ],
    "itemCount": 2,
    "paymentCount": 0,
    "totalPaid": 0
  },
  "code": "ORDER_CREATED_SUCCESS",
  "message": "Order created successfully"
}
```

### Error Response - Validation Error (400)

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": {
    "orderType": {
      "errors": ["Required"]
    },
    "outletId": {
      "errors": ["Expected number, received string"]
    },
    "orderItems": {
      "errors": ["Expected array, received undefined"]
    },
    "orderItems.0.productId": {
      "errors": ["Expected number, received string"]
    },
    "orderItems.0.quantity": {
      "errors": ["Expected number > 0, received 0"]
    }
  }
}
```

### Error Response - Outlet Not Found (404)

```json
{
  "success": false,
  "code": "OUTLET_NOT_FOUND",
  "message": "Outlet not found"
}
```

### Error Response - Cannot Create Order for Other Outlet (403)

```json
{
  "success": false,
  "code": "CANNOT_CREATE_ORDER_FOR_OTHER_OUTLET",
  "message": "You cannot create orders for other outlets"
}
```

### Error Response - Cannot Create Order for Other Merchant (403)

```json
{
  "success": false,
  "code": "CANNOT_CREATE_ORDER_FOR_OTHER_MERCHANT",
  "message": "You cannot create orders for outlets from other merchants"
}
```

### Error Response - Plan Limit Exceeded (403)

```json
{
  "success": false,
  "code": "PLAN_LIMIT_EXCEEDED",
  "message": "You have reached the maximum number of orders allowed by your plan"
}
```

### Error Response - Product Not Found (400)

```json
{
  "success": false,
  "code": "PRODUCT_NOT_FOUND",
  "message": "Product with ID 456 not found"
}
```

### Error Response - Unauthorized (401)

```json
{
  "success": false,
  "code": "UNAUTHORIZED",
  "message": "Access token required"
}
```

---

## 🔑 Important Notes

### 1. Order Status Auto-Assignment
- **SALE orders**: Tự động set status = `"COMPLETED"` (bán ngay)
- **RENT orders**: Tự động set status = `"RESERVED"` (đã đặt, chờ lấy hàng)

### 2. Order Number Generation
- Order number được tự động generate: **6-digit random number** (100000-999999)
- Đảm bảo unique qua transaction

### 3. Rental Duration Calculation
- API tự động tính `rentalDuration` từ `pickupPlanAt` và `returnPlanAt`
- Dựa trên `pricingType` của sản phẩm:
  - `HOURLY`: Tính theo giờ
  - `DAILY`: Tính theo ngày
  - `FIXED`: Duration = 1 (per rental)

### 4. Outlet ID Auto-fill
- Nếu user là `OUTLET_ADMIN` hoặc `OUTLET_STAFF`, `outletId` sẽ tự động được điền từ `userScope`
- Có thể bỏ qua `outletId` trong request nếu user chỉ có 1 outlet

### 5. Stock Management
- **SALE orders** với status `COMPLETED`: Giảm stock vĩnh viễn
- **RENT orders** với status `RESERVED` hoặc `PICKUPED`: Cập nhật `renting` và `available`

### 6. Date Format
- Tất cả dates phải là **ISO 8601 format** (UTC)
- Example: `"2025-01-15T08:00:00.000Z"`

### 7. ID Format
- Frontend gửi **numbers** (publicId)
- Backend tự động convert sang CUIDs cho database operations
- Response trả về **numbers** (publicId)

---

## 📝 cURL Examples

### RENT Order
```bash
curl -X POST https://api.example.com/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "orderType": "RENT",
    "outletId": 1,
    "customerId": 123,
    "pickupPlanAt": "2025-01-15T08:00:00.000Z",
    "returnPlanAt": "2025-01-20T18:00:00.000Z",
    "totalAmount": 500000,
    "depositAmount": 200000,
    "orderItems": [
      {
        "productId": 456,
        "quantity": 2,
        "unitPrice": 250000,
        "totalPrice": 500000,
        "deposit": 100000
      }
    ]
  }'
```

### SALE Order
```bash
curl -X POST https://api.example.com/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "orderType": "SALE",
    "outletId": 1,
    "customerId": 456,
    "totalAmount": 1500000,
    "orderItems": [
      {
        "productId": 111,
        "quantity": 3,
        "unitPrice": 500000,
        "totalPrice": 1500000
      }
    ]
  }'
```

---

## 🔐 Authorization Rules

### Role-Based Access
- **ADMIN**: Có thể tạo order cho bất kỳ outlet nào
- **MERCHANT**: Chỉ có thể tạo order cho outlets của merchant mình
- **OUTLET_ADMIN**: Chỉ có thể tạo order cho outlet được assign
- **OUTLET_STAFF**: Chỉ có thể tạo order cho outlet được assign

### Permission Required
- `orders.create` permission (tự động có với các roles trên)

---

## 🎯 Response Fields Explanation

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Public ID của order |
| `orderNumber` | string | Số order (6 digits) |
| `orderType` | string | Loại order: "RENT", "SALE", "RENT_TO_OWN" |
| `status` | string | Trạng thái: "RESERVED", "PICKUPED", "RETURNED", "COMPLETED", "CANCELLED" |
| `rentalDuration` | number \| null | Số ngày/giờ thuê (tự động tính) |
| `itemCount` | number | Số lượng items trong order |
| `paymentCount` | number | Số lượng payments |
| `totalPaid` | number | Tổng tiền đã thanh toán |

---

## ✅ Validation Rules

1. **orderType**: Phải là "RENT", "SALE", hoặc "RENT_TO_OWN"
2. **outletId**: Phải là số nguyên dương, phải tồn tại
3. **customerId**: Nếu có, phải là số nguyên dương, phải tồn tại
4. **orderItems**: Phải có ít nhất 1 item
5. **orderItems[].productId**: Phải tồn tại trong database
6. **orderItems[].quantity**: Phải > 0
7. **orderItems[].unitPrice**: Phải >= 0
8. **pickupPlanAt/returnPlanAt**: Bắt buộc cho RENT orders
9. **totalAmount**: Phải >= 0

---

## 🚨 Common Errors

1. **Missing required fields**: Thiếu các trường bắt buộc
2. **Invalid outletId**: Outlet không tồn tại hoặc không thuộc merchant của user
3. **Invalid customerId**: Customer không tồn tại
4. **Invalid productId**: Product không tồn tại hoặc không thuộc outlet
5. **Plan limit exceeded**: Vượt quá giới hạn số orders của plan
6. **Stock insufficient**: Không đủ hàng trong kho (cho SALE orders)

