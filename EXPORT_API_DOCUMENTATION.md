# Export API Documentation for Mobile

## Overview

Có 3 export APIs để export dữ liệu sang Excel hoặc CSV:
1. **Customers Export** - Export danh sách khách hàng
2. **Products Export** - Export danh sách sản phẩm
3. **Orders Export** - Export danh sách đơn hàng

---

## 1. Customers Export API

### Endpoint
```
GET /api/customers/export
```

### Authentication
- **Required**: Yes (Bearer Token)
- **Authorization Header**: `Authorization: Bearer <access_token>`
- **Allowed Roles**: 
  - `ADMIN` - Export tất cả customers
  - `MERCHANT` - Export customers của merchant mình
  - `OUTLET_ADMIN` - Export customers của outlet mình
  - `OUTLET_STAFF` - ❌ Không được phép export

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `format` | string | No | `excel` | Format export: `excel` hoặc `csv` |
| `period` | string | Yes | - | Period preset: `1month`, `3months`, `6months`, `1year`, `custom` |
| `startDate` | string (ISO) | Yes (nếu `period=custom`) | - | Start date (ISO 8601 format) |
| `endDate` | string (ISO) | Yes (nếu `period=custom`) | - | End date (ISO 8601 format) |

### Date Range Options

#### Preset Periods
- `1month` - 1 tháng gần nhất
- `3months` - 3 tháng gần nhất
- `6months` - 6 tháng gần nhất
- `1year` - 1 năm gần nhất
- `custom` - Custom range (cần `startDate` và `endDate`)

#### Custom Date Range
- `startDate`: ISO 8601 format (ví dụ: `2024-01-01T00:00:00.000Z`)
- `endDate`: ISO 8601 format (ví dụ: `2024-12-31T23:59:59.999Z`)
- **Maximum range**: 365 days (1 year)
- **Validation**: `startDate < endDate` và `endDate <= today`

### Request Example

```http
GET /api/customers/export?format=excel&period=1month
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

```http
GET /api/customers/export?format=csv&period=custom&startDate=2024-01-01T00:00:00.000Z&endDate=2024-03-31T23:59:59.999Z
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response

#### Success Response (Excel)
- **Status Code**: `200 OK`
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Content-Disposition**: `attachment; filename="customers-export-2024-01-01-2024-03-31.xlsx"`
- **Body**: Excel file (binary)

#### Success Response (CSV)
- **Status Code**: `200 OK`
- **Content-Type**: `text/csv`
- **Content-Disposition**: `attachment; filename="customers-export-2024-01-01.csv"`
- **Body**: CSV content (text)

#### Error Response
```json
{
  "success": false,
  "code": "INVALID_DATE_RANGE",
  "message": "Date range cannot exceed 365 days"
}
```

### Export Data Fields

| Field | Type | Description |
|-------|------|-------------|
| ID | number | Customer ID |
| First Name | string | Tên |
| Last Name | string | Họ |
| Email | string | Email |
| Phone | string | Số điện thoại |
| Address | string | Địa chỉ |
| City | string | Thành phố |
| State | string | Tỉnh/Thành phố |
| Country | string | Quốc gia |
| Zip Code | string | Mã bưu điện |
| ID Type | string | Loại giấy tờ |
| ID Number | string | Số giấy tờ |
| Is Active | string | Trạng thái (Yes/No) |
| Created At | string | Ngày tạo (dd/MM/yyyy) |
| Updated At | string | Ngày cập nhật (dd/MM/yyyy) |

### Filter Logic
- Filter theo `createdAt` của customer
- Tự động filter theo `merchantId` hoặc `outletId` dựa trên user role

---

## 2. Products Export API

### Endpoint
```
GET /api/products/export
```

### Authentication
- **Required**: Yes (Bearer Token)
- **Authorization Header**: `Authorization: Bearer <access_token>`
- **Allowed Roles**: 
  - `ADMIN` - Export tất cả products
  - `MERCHANT` - Export products của merchant mình
  - `OUTLET_ADMIN` - Export products của outlet mình
  - `OUTLET_STAFF` - ❌ Không được phép export

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `format` | string | No | `excel` | Format export: `excel` hoặc `csv` |
| `period` | string | Yes | - | Period preset: `1month`, `3months`, `6months`, `1year`, `custom` |
| `startDate` | string (ISO) | Yes (nếu `period=custom`) | - | Start date (ISO 8601 format) |
| `endDate` | string (ISO) | Yes (nếu `period=custom`) | - | End date (ISO 8601 format) |

### Date Range Options
Tương tự như Customers Export API (xem phần trên)

### Request Example

```http
GET /api/products/export?format=excel&period=3months
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

```http
GET /api/products/export?format=csv&period=custom&startDate=2024-01-01T00:00:00.000Z&endDate=2024-06-30T23:59:59.999Z
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response
Tương tự như Customers Export API

### Export Data Fields

| Field | Type | Description |
|-------|------|-------------|
| ID | number | Product ID |
| Name | string | Tên sản phẩm |
| Barcode | string | Mã vạch |
| Description | string | Mô tả |
| Stock | number | Tổng số lượng |
| Renting | number | Đang cho thuê |
| Available | number | Có sẵn |
| Rent Price | number | Giá thuê (2 decimals) |
| Deposit | number | Tiền cọc (2 decimals) |
| Outlet ID | number | ID outlet |
| Created At | string | Ngày tạo (dd/MM/yyyy) |
| Updated At | string | Ngày cập nhật (dd/MM/yyyy) |

### Filter Logic
- Filter theo `createdAt` của product
- Nếu user có `outletId`: Chỉ export products của outlet đó
- Nếu user không có `outletId` (MERCHANT/ADMIN): Export tất cả products, mỗi product có thể có nhiều rows (1 row per outlet)

---

## 3. Orders Export API

### Endpoint
```
GET /api/orders/export
```

### Authentication
- **Required**: Yes (Bearer Token)
- **Authorization Header**: `Authorization: Bearer <access_token>`
- **Allowed Roles**: 
  - `ADMIN` - Export tất cả orders
  - `MERCHANT` - Export orders của merchant mình
  - `OUTLET_ADMIN` - Export orders của outlet mình
  - `OUTLET_STAFF` - ❌ Không được phép export

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `format` | string | No | `excel` | Format export: `excel` hoặc `csv` |
| `period` | string | Yes | - | Period preset: `1month`, `3months`, `6months`, `1year`, `custom` |
| `startDate` | string (ISO) | Yes (nếu `period=custom`) | - | Start date (ISO 8601 format) |
| `endDate` | string (ISO) | Yes (nếu `period=custom`) | - | End date (ISO 8601 format) |
| `status` | string | No | - | Filter theo status: `RESERVED`, `PICKUPED`, `RETURNED`, `COMPLETED`, `CANCELLED` |
| `orderType` | string | No | - | Filter theo order type: `RENT`, `SALE` |
| `dateField` | string | No | `createdAt` | Field để filter date: `createdAt`, `pickupPlanAt`, `returnPlanAt` |

### Date Range Options
Tương tự như Customers Export API (xem phần trên)

### Request Example

```http
GET /api/orders/export?format=excel&period=1month&status=COMPLETED
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

```http
GET /api/orders/export?format=csv&period=custom&startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z&dateField=pickupPlanAt&orderType=RENT
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response
Tương tự như Customers Export API

### Export Data Fields

| Field | Type | Description |
|-------|------|-------------|
| Order ID | number | Order ID |
| Order Number | string | Số đơn hàng (ORD-001-0001) |
| Order Type | string | Loại đơn: RENT, SALE |
| Status | string | Trạng thái: RESERVED, PICKUPED, RETURNED, COMPLETED, CANCELLED |
| Customer Name | string | Tên khách hàng |
| Customer Email | string | Email khách hàng |
| Customer Phone | string | Số điện thoại khách hàng |
| Outlet ID | number | ID outlet |
| Outlet Name | string | Tên outlet |
| Outlet Address | string | Địa chỉ outlet |
| Created By ID | number | ID người tạo đơn |
| Created By Name | string | Tên người tạo đơn |
| Created By Email | string | Email người tạo đơn |
| Discount Type | string | Loại giảm giá |
| Discount Value | number | Giá trị giảm giá |
| Discount Amount | number | Số tiền giảm giá (2 decimals) |
| Total Amount | number | Tổng tiền (2 decimals) |
| Deposit Amount | number | Tiền cọc (2 decimals) |
| Pickup Plan Date | string | Ngày dự kiến lấy (dd/MM/yyyy) |
| Return Plan Date | string | Ngày dự kiến trả (dd/MM/yyyy) |
| Picked Up Date | string | Ngày đã lấy (dd/MM/yyyy) |
| Returned Date | string | Ngày đã trả (dd/MM/yyyy) |
| Created At | string | Ngày tạo (dd/MM/yyyy HH:mm) |
| Updated At | string | Ngày cập nhật (dd/MM/yyyy HH:mm) |

### Filter Logic
- Filter theo `dateField` (mặc định: `createdAt`)
- Có thể filter thêm theo `status` và `orderType`
- Tự động filter theo `merchantId` hoặc `outletId` dựa trên user role

---

## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "code": "UNAUTHORIZED",
  "message": "Access token required"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "code": "FORBIDDEN",
  "message": "Insufficient permissions"
}
```

#### 400 Bad Request - Invalid Date Range
```json
{
  "success": false,
  "code": "INVALID_DATE_RANGE",
  "message": "Date range cannot exceed 365 days"
}
```

#### 400 Bad Request - Missing Parameters
```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "startDate and endDate are required for custom period"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "code": "INTERNAL_ERROR",
  "message": "An error occurred while exporting data"
}
```

---

## Mobile Implementation Guide

### 1. Authentication
```typescript
// Example: React Native / Flutter
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

### 2. Date Range Helper
```typescript
// Helper function để tạo date range
function getDateRange(period: string): { startDate: string, endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '1month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case '3months':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case '6months':
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case '1year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}
```

### 3. Download File
```typescript
// Example: React Native
import RNFS from 'react-native-fs';

async function downloadExport(url: string, filename: string) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Export failed');
  }
  
  const blob = await response.blob();
  const path = `${RNFS.DocumentDirectoryPath}/${filename}`;
  
  // Convert blob to base64 and save
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64data = reader.result;
    RNFS.writeFile(path, base64data, 'base64');
  };
  reader.readAsDataURL(blob);
  
  return path;
}
```

### 4. Complete Example
```typescript
// Example: Export customers
async function exportCustomers(period: string, format: 'excel' | 'csv' = 'excel') {
  const baseUrl = 'https://api.rentalshop.com';
  const { startDate, endDate } = getDateRange(period);
  
  const url = `${baseUrl}/api/customers/export?format=${format}&period=${period}&startDate=${startDate}&endDate=${endDate}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    
    // Get filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `customers-export.${format === 'excel' ? 'xlsx' : 'csv'}`;
    
    // Download file
    const filePath = await downloadExport(url, filename);
    
    return filePath;
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}
```

---

## Notes

1. **Date Format**: Tất cả dates phải là ISO 8601 format (`YYYY-MM-DDTHH:mm:ss.sssZ`)
2. **Maximum Range**: Date range không được vượt quá 365 days (1 year)
3. **File Size**: Export có thể tạo file lớn, cần handle timeout và progress
4. **Caching**: Response có `Cache-Control: no-cache`, không cache file
5. **Role-Based Access**: Data tự động filter theo role của user
6. **Rate Limiting**: Có thể có rate limiting, cần handle 429 Too Many Requests

---

## API Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://api.rentalshop.com` (hoặc URL thực tế của bạn)

---

## Support

Nếu có vấn đề, kiểm tra:
1. Authentication token có hợp lệ không
2. User role có permission export không
3. Date range có hợp lệ không (max 365 days)
4. Network connection và timeout settings

