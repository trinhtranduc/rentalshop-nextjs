# Order Search API - Full Documentation for iOS

## Endpoint

```
GET /api/orders
```

## Authentication

**Required Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
X-Client-Platform: ios
X-App-Version: {app_version}
X-Device-Type: {device_type}
```

## Query Parameters

### Filter Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `q` | string | No | Search query (searches in order number, customer name, customer phone) | `q=ORD-001` |
| `status` | enum | No | Order status filter | `status=RESERVED` |
| `orderType` | enum | No | Order type filter | `orderType=RENT` |
| `merchantId` | number | No | Filter by merchant ID (ADMIN only) | `merchantId=44` |
| `outletId` | number | No | Filter by outlet ID | `outletId=46` |
| `customerId` | number | No | Filter by customer ID | `customerId=710` |
| `productId` | number | No | Filter by product ID | `productId=1094` |
| `startDate` | date | No | Start date for date range filter (ISO 8601) | `startDate=2026-01-01T00:00:00.000Z` |
| `endDate` | date | No | End date for date range filter (ISO 8601) | `endDate=2026-01-31T23:59:59.999Z` |
| `pickupDate` | date | No | Filter by pickup planned date | `pickupDate=2026-01-10T00:00:00.000Z` |
| `returnDate` | date | No | Filter by return planned date | `returnDate=2026-01-11T00:00:00.000Z` |
| `minAmount` | number | No | Minimum order amount filter | `minAmount=100000` |
| `maxAmount` | number | No | Maximum order amount filter | `maxAmount=500000` |

### Pagination Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number (1-based) |
| `limit` | number | No | 20 | Items per page (min: 1, max: 100) |

### Sorting Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `sortBy` | string | No | `createdAt` | Field to sort by (e.g., `createdAt`, `orderNumber`, `totalAmount`) |
| `sortOrder` | enum | No | `desc` | Sort order: `asc` or `desc` |

## Order Status Values

```swift
enum OrderStatus: String {
    case RESERVED = "RESERVED"      // Đã đặt cọc, chờ lấy hàng
    case PICKUPED = "PICKUPED"      // Đã lấy hàng, đang thuê
    case RETURNED = "RETURNED"       // Đã trả hàng (cho đơn thuê)
    case COMPLETED = "COMPLETED"    // Hoàn thành (cho đơn bán)
    case CANCELLED = "CANCELLED"    // Đã hủy
}
```

## Order Type Values

```swift
enum OrderType: String {
    case RENT = "RENT"      // Thuê
    case SALE = "SALE"      // Bán
}
```

## Request Examples

### Example 1: Get all orders with pagination

```swift
let url = URL(string: "https://api.anyrent.shop/api/orders?page=1&limit=20")!
var request = URLRequest(url: url)
request.httpMethod = "GET"
request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
request.setValue("1.0.0", forHTTPHeaderField: "X-App-Version")
request.setValue("iPhone", forHTTPHeaderField: "X-Device-Type")
```

### Example 2: Filter by status

```swift
let url = URL(string: "https://api.anyrent.shop/api/orders?status=RESERVED&page=1&limit=20")!
```

### Example 3: Filter by order type

```swift
let url = URL(string: "https://api.anyrent.shop/api/orders?orderType=RENT&page=1&limit=20")!
```

### Example 4: Filter by date range

```swift
let startDate = "2026-01-01T00:00:00.000Z"
let endDate = "2026-01-31T23:59:59.999Z"
let url = URL(string: "https://api.anyrent.shop/api/orders?startDate=\(startDate)&endDate=\(endDate)&page=1&limit=20")!
```

### Example 5: Filter by customer

```swift
let url = URL(string: "https://api.anyrent.shop/api/orders?customerId=710&page=1&limit=20")!
```

### Example 6: Filter by outlet

```swift
let url = URL(string: "https://api.anyrent.shop/api/orders?outletId=46&page=1&limit=20")!
```

### Example 7: Search by query string

```swift
let query = "ORD-001"
let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
let url = URL(string: "https://api.anyrent.shop/api/orders?q=\(encodedQuery)&page=1&limit=20")!
```

### Example 8: Multiple filters combined

```swift
let url = URL(string: "https://api.anyrent.shop/api/orders?status=RESERVED&orderType=RENT&outletId=46&startDate=2026-01-01T00:00:00.000Z&endDate=2026-01-31T23:59:59.999Z&page=1&limit=20&sortBy=createdAt&sortOrder=desc")!
```

### Example 9: Filter by amount range

```swift
let url = URL(string: "https://api.anyrent.shop/api/orders?minAmount=100000&maxAmount=500000&page=1&limit=20")!
```

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 867,
        "orderNumber": "367532",
        "orderType": "RENT",
        "status": "RESERVED",
        "totalAmount": 59000,
        "depositAmount": 200000,
        "securityDeposit": 0,
        "damageFee": 0,
        "lateFee": 0,
        "discountType": null,
        "discountValue": 0,
        "discountAmount": 0,
        "pickupPlanAt": "2026-01-10T17:00:00.000Z",
        "returnPlanAt": "2026-01-11T17:00:00.000Z",
        "pickedUpAt": null,
        "returnedAt": null,
        "rentalDuration": 1,
        "isReadyToDeliver": false,
        "collateralType": null,
        "collateralDetails": null,
        "notes": "đã ck đủ k pk",
        "pickupNotes": null,
        "returnNotes": null,
        "damageNotes": null,
        "createdAt": "2026-01-10T13:30:25.647Z",
        "updatedAt": "2026-01-10T13:30:25.647Z",
        "deletedAt": null,
        "outletId": 46,
        "customerId": 710,
        "createdById": 1041,
        "rentalDurationUnit": null,
        "customer": {
          "id": 710,
          "firstName": "Thuý",
          "lastName": "An",
          "phone": null,
          "email": null
        },
        "outlet": {
          "id": 46,
          "name": "Matura - Tiệm thuê đồ Củ Chi - Main Store",
          "merchantId": 44,
          "merchant": {
            "id": 44,
            "name": "Matura - Tiệm thuê đồ Củ Chi"
          }
        },
        "createdBy": {
          "id": 1041,
          "firstName": "Nguyễn",
          "lastName": "Thị Minh Thư"
        },
        "orderItems": []
      }
    ],
    "total": 120,
    "page": 1,
    "limit": 20,
    "offset": 0,
    "hasMore": true,
    "totalPages": 6
  },
  "code": "ORDERS_FOUND",
  "message": "Found 120 orders"
}
```

### Error Response (400 Bad Request)

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "VALIDATION_ERROR",
  "error": {
    "fieldErrors": {
      "status": ["Invalid status value"],
      "limit": ["Limit must be between 1 and 100"]
    }
  }
}
```

### Error Response (401 Unauthorized)

```json
{
  "success": false,
  "code": "UNAUTHORIZED",
  "message": "Access token required"
}
```

### Error Response (403 Forbidden)

```json
{
  "success": false,
  "code": "MERCHANT_ASSOCIATION_REQUIRED",
  "message": "User must be associated with a merchant"
}
```

## Response Fields

### Order Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Order ID (public ID) |
| `orderNumber` | string | Order number (e.g., "367532") |
| `orderType` | string | Order type: "RENT" or "SALE" |
| `status` | string | Order status: "RESERVED", "PICKUPED", "RETURNED", "COMPLETED", "CANCELLED" |
| `totalAmount` | number | Total order amount |
| `depositAmount` | number | Deposit amount |
| `securityDeposit` | number | Security deposit |
| `damageFee` | number | Damage fee |
| `lateFee` | number | Late fee |
| `discountType` | string\|null | Discount type |
| `discountValue` | number | Discount value |
| `discountAmount` | number | Discount amount |
| `pickupPlanAt` | string\|null | Planned pickup date (ISO 8601) |
| `returnPlanAt` | string\|null | Planned return date (ISO 8601) |
| `pickedUpAt` | string\|null | Actual pickup date (ISO 8601) |
| `returnedAt` | string\|null | Actual return date (ISO 8601) |
| `rentalDuration` | number | Rental duration in days |
| `isReadyToDeliver` | boolean | Whether order is ready to deliver |
| `collateralType` | string\|null | Collateral type |
| `collateralDetails` | string\|null | Collateral details |
| `notes` | string\|null | Order notes |
| `pickupNotes` | string\|null | Pickup notes |
| `returnNotes` | string\|null | Return notes |
| `damageNotes` | string\|null | Damage notes |
| `createdAt` | string | Order creation date (ISO 8601) |
| `updatedAt` | string | Order last update date (ISO 8601) |
| `deletedAt` | string\|null | Order deletion date (ISO 8601) |
| `outletId` | number | Outlet ID |
| `customerId` | number\|null | Customer ID |
| `createdById` | number | User ID who created the order |
| `rentalDurationUnit` | string\|null | Rental duration unit |
| `customer` | object\|null | Customer object |
| `outlet` | object | Outlet object |
| `createdBy` | object | User who created the order |
| `orderItems` | array | Order items (empty in lightweight response) |

### Pagination Object

| Field | Type | Description |
|-------|------|-------------|
| `total` | number | Total number of orders |
| `page` | number | Current page number |
| `limit` | number | Items per page |
| `offset` | number | Offset for pagination |
| `hasMore` | boolean | Whether there are more pages |
| `totalPages` | number | Total number of pages |

## Role-Based Access Control

### ADMIN Role
- Can see orders from all merchants (unless `merchantId` is specified)
- Can filter by any `merchantId` or `outletId`

### MERCHANT Role
- Can only see orders from their own merchant
- Can filter by any `outletId` within their merchant
- Cannot filter by `merchantId` (automatically restricted to their merchant)

### OUTLET_ADMIN / OUTLET_STAFF Role
- Can only see orders from their assigned outlet
- Cannot filter by `outletId` or `merchantId` (automatically restricted to their outlet)

## Swift Implementation Example

```swift
import Foundation

struct OrderSearchRequest {
    var q: String?
    var status: OrderStatus?
    var orderType: OrderType?
    var merchantId: Int?
    var outletId: Int?
    var customerId: Int?
    var productId: Int?
    var startDate: Date?
    var endDate: Date?
    var pickupDate: Date?
    var returnDate: Date?
    var minAmount: Double?
    var maxAmount: Double?
    var page: Int = 1
    var limit: Int = 20
    var sortBy: String = "createdAt"
    var sortOrder: SortOrder = .desc
    
    enum SortOrder: String {
        case asc = "asc"
        case desc = "desc"
    }
    
    func toQueryItems() -> [URLQueryItem] {
        var items: [URLQueryItem] = []
        
        if let q = q { items.append(URLQueryItem(name: "q", value: q)) }
        if let status = status { items.append(URLQueryItem(name: "status", value: status.rawValue)) }
        if let orderType = orderType { items.append(URLQueryItem(name: "orderType", value: orderType.rawValue)) }
        if let merchantId = merchantId { items.append(URLQueryItem(name: "merchantId", value: "\(merchantId)")) }
        if let outletId = outletId { items.append(URLQueryItem(name: "outletId", value: "\(outletId)")) }
        if let customerId = customerId { items.append(URLQueryItem(name: "customerId", value: "\(customerId)")) }
        if let productId = productId { items.append(URLQueryItem(name: "productId", value: "\(productId)")) }
        if let startDate = startDate {
            let formatter = ISO8601DateFormatter()
            items.append(URLQueryItem(name: "startDate", value: formatter.string(from: startDate)))
        }
        if let endDate = endDate {
            let formatter = ISO8601DateFormatter()
            items.append(URLQueryItem(name: "endDate", value: formatter.string(from: endDate)))
        }
        if let pickupDate = pickupDate {
            let formatter = ISO8601DateFormatter()
            items.append(URLQueryItem(name: "pickupDate", value: formatter.string(from: pickupDate)))
        }
        if let returnDate = returnDate {
            let formatter = ISO8601DateFormatter()
            items.append(URLQueryItem(name: "returnDate", value: formatter.string(from: returnDate)))
        }
        if let minAmount = minAmount { items.append(URLQueryItem(name: "minAmount", value: "\(minAmount)")) }
        if let maxAmount = maxAmount { items.append(URLQueryItem(name: "maxAmount", value: "\(maxAmount)")) }
        
        items.append(URLQueryItem(name: "page", value: "\(page)"))
        items.append(URLQueryItem(name: "limit", value: "\(limit)"))
        items.append(URLQueryItem(name: "sortBy", value: sortBy))
        items.append(URLQueryItem(name: "sortOrder", value: sortOrder.rawValue))
        
        return items
    }
}

class OrderService {
    private let baseURL = "https://api.anyrent.shop"
    private let accessToken: String
    
    init(accessToken: String) {
        self.accessToken = accessToken
    }
    
    func searchOrders(request: OrderSearchRequest) async throws -> OrdersResponse {
        var components = URLComponents(string: "\(baseURL)/api/orders")!
        components.queryItems = request.toQueryItems()
        
        guard let url = components.url else {
            throw URLError(.badURL)
        }
        
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "GET"
        urlRequest.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("ios", forHTTPHeaderField: "X-Client-Platform")
        urlRequest.setValue("1.0.0", forHTTPHeaderField: "X-App-Version")
        urlRequest.setValue("iPhone", forHTTPHeaderField: "X-Device-Type")
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw URLError(.badServerResponse)
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data)
            throw APIError.httpError(statusCode: httpResponse.statusCode, message: errorResponse?.message ?? "Unknown error")
        }
        
        let apiResponse = try JSONDecoder().decode(APIResponse<OrdersResponse>.self, from: data)
        
        guard apiResponse.success else {
            throw APIError.apiError(code: apiResponse.code, message: apiResponse.message)
        }
        
        return apiResponse.data
    }
}

// Response Models
struct APIResponse<T: Codable>: Codable {
    let success: Bool
    let data: T
    let code: String
    let message: String
}

struct OrdersResponse: Codable {
    let orders: [Order]
    let total: Int
    let page: Int
    let limit: Int
    let offset: Int
    let hasMore: Bool
    let totalPages: Int
}

struct Order: Codable {
    let id: Int
    let orderNumber: String
    let orderType: String
    let status: String
    let totalAmount: Double
    let depositAmount: Double
    let securityDeposit: Double
    let damageFee: Double
    let lateFee: Double
    let discountType: String?
    let discountValue: Double
    let discountAmount: Double
    let pickupPlanAt: String?
    let returnPlanAt: String?
    let pickedUpAt: String?
    let returnedAt: String?
    let rentalDuration: Int?
    let isReadyToDeliver: Bool
    let collateralType: String?
    let collateralDetails: String?
    let notes: String?
    let pickupNotes: String?
    let returnNotes: String?
    let damageNotes: String?
    let createdAt: String
    let updatedAt: String
    let deletedAt: String?
    let outletId: Int
    let customerId: Int?
    let createdById: Int
    let rentalDurationUnit: String?
    let customer: Customer?
    let outlet: Outlet
    let createdBy: User
    let orderItems: [OrderItem]
}

struct Customer: Codable {
    let id: Int
    let firstName: String
    let lastName: String
    let phone: String?
    let email: String?
}

struct Outlet: Codable {
    let id: Int
    let name: String
    let merchantId: Int
    let merchant: Merchant?
}

struct Merchant: Codable {
    let id: Int
    let name: String
}

struct User: Codable {
    let id: Int
    let firstName: String?
    let lastName: String?
}

struct OrderItem: Codable {
    let id: Int
    let quantity: Int
    let unitPrice: Double
    let totalPrice: Double
    // ... other fields
}

struct ErrorResponse: Codable {
    let success: Bool
    let code: String
    let message: String
    let error: [String: Any]?
}

enum APIError: Error {
    case httpError(statusCode: Int, message: String)
    case apiError(code: String, message: String)
    case decodingError(Error)
}
```

## Usage Example

```swift
// Initialize service
let orderService = OrderService(accessToken: "your_access_token")

// Search orders by status
let request = OrderSearchRequest(
    status: .RESERVED,
    page: 1,
    limit: 20
)

do {
    let response = try await orderService.searchOrders(request: request)
    print("Found \(response.total) orders")
    for order in response.orders {
        print("Order: \(order.orderNumber), Status: \(order.status)")
    }
} catch {
    print("Error: \(error)")
}

// Search orders with multiple filters
let complexRequest = OrderSearchRequest(
    status: .RESERVED,
    orderType: .RENT,
    outletId: 46,
    startDate: Date(),
    endDate: Calendar.current.date(byAdding: .day, value: 30, to: Date()),
    page: 1,
    limit: 50,
    sortBy: "createdAt",
    sortOrder: .desc
)

do {
    let response = try await orderService.searchOrders(request: complexRequest)
    // Handle response
} catch {
    // Handle error
}
```

## Notes

1. **Date Format**: All dates should be in ISO 8601 format (e.g., `2026-01-10T17:00:00.000Z`)
2. **Pagination**: Use `page` and `limit` for pagination. `page` is 1-based.
3. **Role-Based Filtering**: The API automatically applies role-based filtering. You don't need to manually filter by merchant/outlet unless you're an ADMIN.
4. **Search Query**: The `q` parameter searches in order number, customer name, and customer phone.
5. **Sorting**: Default sort is by `createdAt` in descending order (newest first).
6. **Response**: The `orderItems` array is empty in the lightweight response. Use `/api/orders/{orderId}` to get full order details with items.
