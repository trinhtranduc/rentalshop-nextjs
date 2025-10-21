# Model Fields Documentation

Đây là tài liệu mô tả các trường của các model trong hệ thống Rental Shop để cập nhật lại model cho Swift project.

## 1. User Model

### Database Schema (Primary Key: Auto-increment Integer)
```prisma
model User {
  id                     Int                    @id @default(autoincrement())
  email                  String                 @unique
  password               String
  firstName              String
  lastName               String
  phone                  String?
  role                   String                 @default("OUTLET_STAFF")
  isActive               Boolean                @default(true)
  createdAt              DateTime               @default(now())
  updatedAt              DateTime               @updatedAt
  merchantId             Int?
  outletId               Int?
  deletedAt              DateTime?
}
```

### Field Mapping cho Swift
```swift
struct User {
    let id: Int                    // Primary Key - Auto-increment
    let email: String              // Unique email address
    let password: String           // Hashed password (internal use only)
    let firstName: String          // User's first name
    let lastName: String           // User's last name
    let phone: String?             // Optional phone number
    let role: UserRole             // User role enum
    let isActive: Bool             // Account status
    let createdAt: Date            // Creation timestamp
    let updatedAt: Date            // Last update timestamp
    let merchantId: Int?           // Associated merchant ID
    let outletId: Int?             // Associated outlet ID
    let deletedAt: Date?           // Soft delete timestamp
}

enum UserRole: String, CaseIterable {
    case admin = "ADMIN"
    case merchant = "MERCHANT"
    case outletAdmin = "OUTLET_ADMIN"
    case outletStaff = "OUTLET_STAFF"
}
```

## 2. Merchant Model

### Database Schema
```prisma
model Merchant {
  id                 Int           @id @default(autoincrement())
  name               String
  email              String        @unique
  phone              String?
  address            String?
  city               String?
  state              String?
  zipCode            String?
  country            String?
  businessType       String?
  taxId              String?
  website            String?
  description        String?
  currency           String        @default("USD")
  planId             Int?
  totalRevenue       Float         @default(0)
  lastActiveAt       DateTime?
  isActive           Boolean       @default(true)
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
  pricingConfig      String?
  pricingType        String?
}
```

### Field Mapping cho Swift
```swift
struct Merchant {
    let id: Int                    // Primary Key
    let name: String               // Business name
    let email: String              // Unique email
    let phone: String?             // Phone number
    let address: String?           // Business address
    let city: String?              // City
    let state: String?             // State/Province
    let zipCode: String?           // Postal code
    let country: String?           // Country
    let businessType: String?      // Type of business
    let taxId: String?             // Tax identification
    let website: String?           // Website URL
    let description: String?       // Business description
    let currency: String           // Default currency (USD, VND)
    let planId: Int?               // Subscription plan ID
    let totalRevenue: Double       // Total revenue amount
    let lastActiveAt: Date?        // Last activity timestamp
    let isActive: Bool             // Business status
    let createdAt: Date            // Creation timestamp
    let updatedAt: Date            // Last update timestamp
    let pricingConfig: String?     // JSON pricing configuration
    let pricingType: String?       // Pricing method (FIXED, HOURLY, DAILY)
}
```

## 3. Outlet Model

### Database Schema
```prisma
model Outlet {
  id          Int           @id @default(autoincrement())
  name        String
  address     String?
  description String?
  isActive    Boolean       @default(true)
  isDefault   Boolean       @default(false)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  merchantId  Int
  phone       String?
  city        String?
  country     String?
  state       String?
  zipCode     String?
}
```

### Field Mapping cho Swift
```swift
struct Outlet {
    let id: Int                    // Primary Key
    let name: String               // Outlet name
    let address: String?           // Physical address
    let description: String?       // Outlet description
    let isActive: Bool             // Active status
    let isDefault: Bool            // Default outlet flag
    let createdAt: Date            // Creation timestamp
    let updatedAt: Date            // Last update timestamp
    let merchantId: Int            // Parent merchant ID
    let phone: String?             // Phone number
    let city: String?              // City
    let country: String?           // Country
    let state: String?             // State/Province
    let zipCode: String?           // Postal code
}
```

## 4. Customer Model

### Database Schema
```prisma
model Customer {
  id          Int       @id @default(autoincrement())
  firstName   String
  lastName    String
  email       String?
  phone       String
  address     String?
  city        String?
  state       String?
  zipCode     String?
  country     String?
  dateOfBirth DateTime?
  idNumber    String?
  idType      String?
  notes       String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  merchantId  Int
}
```

### Field Mapping cho Swift
```swift
struct Customer {
    let id: Int                    // Primary Key
    let firstName: String          // Customer first name
    let lastName: String           // Customer last name
    let email: String?             // Email address
    let phone: String              // Phone number (required)
    let address: String?           // Address
    let city: String?              // City
    let state: String?             // State
    let zipCode: String?           // ZIP code
    let country: String?           // Country
    let dateOfBirth: Date?         // Date of birth
    let idNumber: String?          // ID number
    let idType: String?            // ID type (passport, drivers_license, etc.)
    let notes: String?             // Additional notes
    let isActive: Bool             // Active status
    let createdAt: Date            // Creation timestamp
    let updatedAt: Date            // Last update timestamp
    let merchantId: Int            // Associated merchant ID
}

enum IdType: String, CaseIterable {
    case passport = "passport"
    case driversLicense = "drivers_license"
    case nationalId = "national_id"
    case other = "other"
}
```

## 5. Product Model

### Database Schema
```prisma
model Product {
  id          Int           @id @default(autoincrement())
  name        String
  description String?
  barcode     String?       @unique
  totalStock  Int           @default(0)
  rentPrice   Float
  salePrice   Float?
  deposit     Float         @default(0)
  images      String?
  isActive    Boolean       @default(true)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
  merchantId  Int
  categoryId  Int
}
```

### Field Mapping cho Swift
```swift
struct Product {
    let id: Int                    // Primary Key
    let name: String               // Product name
    let description: String?       // Product description
    let barcode: String?           // Unique barcode
    let totalStock: Int            // Total inventory
    let rentPrice: Double          // Rental price
    let salePrice: Double?         // Sale price (optional)
    let deposit: Double            // Deposit amount
    let images: String?            // Image URLs (JSON string)
    let isActive: Bool             // Active status
    let createdAt: Date            // Creation timestamp
    let updatedAt: Date            // Last update timestamp
    let merchantId: Int            // Associated merchant ID
    let categoryId: Int            // Product category ID
}
```

## 6. Category Model

### Database Schema
```prisma
model Category {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  isActive    Boolean   @default(true)
  isDefault   Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  merchantId  Int
}
```

### Field Mapping cho Swift
```swift
struct Category {
    let id: Int                    // Primary Key
    let name: String               // Category name
    let description: String?       // Category description
    let isActive: Bool             // Active status
    let isDefault: Bool            // Default category flag
    let createdAt: Date            // Creation timestamp
    let updatedAt: Date            // Last update timestamp
    let merchantId: Int            // Associated merchant ID
}
```

## 7. Order Model

### Database Schema
```prisma
model Order {
  id                Int         @id @default(autoincrement())
  orderNumber       String      @unique
  orderType         String
  status            String      @default("RESERVED")
  totalAmount       Float
  depositAmount     Float       @default(0)
  securityDeposit   Float       @default(0)
  damageFee         Float       @default(0)
  lateFee           Float       @default(0)
  discountType      String?
  discountValue     Float       @default(0)
  discountAmount    Float       @default(0)
  pickupPlanAt      DateTime?
  returnPlanAt      DateTime?
  pickedUpAt        DateTime?
  returnedAt        DateTime?
  rentalDuration    Int?
  isReadyToDeliver  Boolean     @default(false)
  collateralType    String?
  collateralDetails String?
  notes             String?
  pickupNotes       String?
  returnNotes       String?
  damageNotes       String?
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt
  outletId          Int
  customerId        Int?
  createdById       Int
}
```

### Field Mapping cho Swift
```swift
struct Order {
    let id: Int                    // Primary Key
    let orderNumber: String        // Unique order number
    let orderType: OrderType       // Order type enum
    let status: OrderStatus        // Order status enum
    let totalAmount: Double        // Total order amount
    let depositAmount: Double      // Deposit amount
    let securityDeposit: Double    // Security deposit
    let damageFee: Double          // Damage fee
    let lateFee: Double            // Late return fee
    let discountType: String?      // Discount type
    let discountValue: Double      // Discount value
    let discountAmount: Double     // Discount amount
    let pickupPlanAt: Date?        // Planned pickup time
    let returnPlanAt: Date?        // Planned return time
    let pickedUpAt: Date?          // Actual pickup time
    let returnedAt: Date?          // Actual return time
    let rentalDuration: Int?       // Rental duration in days
    let isReadyToDeliver: Bool     // Ready to deliver status
    let collateralType: String?    // Type of collateral
    let collateralDetails: String? // Collateral details
    let notes: String?             // General notes
    let pickupNotes: String?       // Pickup notes
    let returnNotes: String?       // Return notes
    let damageNotes: String?       // Damage notes
    let createdAt: Date            // Creation timestamp
    let updatedAt: Date            // Last update timestamp
    let outletId: Int              // Associated outlet ID
    let customerId: Int?           // Associated customer ID
    let createdById: Int           // Created by user ID
}

enum OrderType: String, CaseIterable {
    case rent = "RENT"
    case sale = "SALE"
}

enum OrderStatus: String, CaseIterable {
    case reserved = "RESERVED"
    case pickuped = "PICKUPED"
    case returned = "RETURNED"
    case completed = "COMPLETED"
    case cancelled = "CANCELLED"
}
```

## 8. OrderItem Model

### Database Schema
```prisma
model OrderItem {
  id              Int      @id @default(autoincrement())
  quantity        Int      @default(1)
  unitPrice       Float
  totalPrice      Float
  deposit         Float    @default(0)
  orderId         Int
  productId       Int?
  productName     String
  productBarcode  String?
  notes           String?
  rentalDays      Int?
}
```

### Field Mapping cho Swift
```swift
struct OrderItem {
    let id: Int                    // Primary Key
    let quantity: Int              // Item quantity
    let unitPrice: Double          // Price per unit
    let totalPrice: Double         // Total price for this item
    let deposit: Double            // Item deposit
    let orderId: Int               // Parent order ID
    let productId: Int?            // Product ID (nullable if product deleted)
    let productName: String        // Snapshot of product name
    let productBarcode: String?    // Snapshot of product barcode
    let notes: String?             // Item-specific notes
    let rentalDays: Int?           // Rental duration for this item
}
```

## 9. OutletStock Model

### Database Schema
```prisma
model OutletStock {
  id        Int      @id @default(autoincrement())
  stock     Int      @default(0)
  available Int      @default(0)
  renting   Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  productId Int
  outletId  Int
}
```

### Field Mapping cho Swift
```swift
struct OutletStock {
    let id: Int                    // Primary Key
    let stock: Int                 // Total stock quantity
    let available: Int             // Available quantity (stock - renting)
    let renting: Int               // Currently renting quantity
    let createdAt: Date            // Creation timestamp
    let updatedAt: Date            // Last update timestamp
    let productId: Int             // Associated product ID
    let outletId: Int              // Associated outlet ID
}
```

## 10. Payment Model

### Database Schema
```prisma
model Payment {
  id             Int           @id @default(autoincrement())
  amount         Float
  currency       String        @default("USD")
  method         String
  type           String
  status         String        @default("PENDING")
  reference      String?
  transactionId  String?
  invoiceNumber  String?
  description    String?
  notes          String?
  failureReason  String?
  metadata       String?
  processedAt    DateTime?
  processedBy    String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  orderId        Int?
  subscriptionId Int?
  merchantId     Int?
}
```

### Field Mapping cho Swift
```swift
struct Payment {
    let id: Int                    // Primary Key
    let amount: Double             // Payment amount
    let currency: String           // Currency code (USD, VND)
    let method: String             // Payment method
    let type: String               // Payment type
    let status: PaymentStatus      // Payment status enum
    let reference: String?         // Payment reference
    let transactionId: String?     // Transaction ID
    let invoiceNumber: String?     // Invoice number
    let description: String?       // Payment description
    let notes: String?             // Additional notes
    let failureReason: String?     // Failure reason if failed
    let metadata: String?          // Additional metadata (JSON)
    let processedAt: Date?         // Processing timestamp
    let processedBy: String?       // Processed by user
    let createdAt: Date            // Creation timestamp
    let updatedAt: Date            // Last update timestamp
    let orderId: Int?              // Associated order ID
    let subscriptionId: Int?       // Associated subscription ID
    let merchantId: Int?           // Associated merchant ID
}

enum PaymentStatus: String, CaseIterable {
    case pending = "PENDING"
    case completed = "COMPLETED"
    case failed = "FAILED"
    case cancelled = "CANCELLED"
}
```

## 11. Plan Model

### Database Schema
```prisma
model Plan {
  id            Int            @id @default(autoincrement())
  name          String         @unique
  description   String
  basePrice     Float
  currency      String         @default("USD")
  trialDays     Int            @default(14)
  limits        String         @default("{\"outlets\": 0, \"users\": 0, \"products\": 0, \"customers\": 0}")
  features      String         @default("[]")
  isActive      Boolean        @default(true)
  isPopular     Boolean        @default(false)
  sortOrder     Int            @default(0)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  deletedAt     DateTime?
}
```

### Field Mapping cho Swift
```swift
struct Plan {
    let id: Int                    // Primary Key
    let name: String               // Plan name (unique)
    let description: String        // Plan description
    let basePrice: Double          // Base price
    let currency: String           // Currency code
    let trialDays: Int             // Trial period in days
    let limits: String             // Plan limits (JSON string)
    let features: String           // Plan features (JSON string)
    let isActive: Bool             // Active status
    let isPopular: Bool            // Popular plan flag
    let sortOrder: Int             // Display order
    let createdAt: Date            // Creation timestamp
    let updatedAt: Date            // Last update timestamp
    let deletedAt: Date?           // Deletion timestamp
}
```

## 12. Subscription Model

### Database Schema
```prisma
model Subscription {
  id                 Int                    @id @default(autoincrement())
  merchantId         Int                    @unique
  planId             Int
  status             String                 @default("trial")
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  trialStart         DateTime?
  trialEnd           DateTime?
  cancelAtPeriodEnd  Boolean                @default(false)
  canceledAt         DateTime?
  cancelReason       String?
  amount             Float
  currency           String                 @default("USD")
  interval           String                 @default("month")
  intervalCount      Int                    @default(1)
  period             Int                    @default(1)
  discount           Float                  @default(0)
  savings            Float                  @default(0)
  createdAt          DateTime               @default(now())
  updatedAt          DateTime               @updatedAt
}
```

### Field Mapping cho Swift
```swift
struct Subscription {
    let id: Int                    // Primary Key
    let merchantId: Int            // Associated merchant ID (unique)
    let planId: Int                // Associated plan ID
    let status: SubscriptionStatus // Subscription status
    let currentPeriodStart: Date   // Current period start
    let currentPeriodEnd: Date     // Current period end
    let trialStart: Date?          // Trial start date
    let trialEnd: Date?            // Trial end date
    let cancelAtPeriodEnd: Bool    // Cancel at period end flag
    let canceledAt: Date?          // Cancellation date
    let cancelReason: String?      // Cancellation reason
    let amount: Double             // Subscription amount
    let currency: String           // Currency code
    let interval: String           // Billing interval (month, year)
    let intervalCount: Int         // Interval count
    let period: Int                // Period number
    let discount: Double           // Discount amount
    let savings: Double            // Total savings
    let createdAt: Date            // Creation timestamp
    let updatedAt: Date            // Last update timestamp
}

enum SubscriptionStatus: String, CaseIterable {
    case trial = "trial"
    case active = "active"
    case cancelled = "cancelled"
    case expired = "expired"
}
```

## 13. UserSession Model

### Database Schema
```prisma
model UserSession {
  id          Int       @id @default(autoincrement())
  userId      Int
  sessionId   String    @unique
  ipAddress   String?
  userAgent   String?
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  expiresAt   DateTime
  invalidatedAt DateTime?
}
```

### Field Mapping cho Swift
```swift
struct UserSession {
    let id: Int                    // Primary Key
    let userId: Int                // Associated user ID
    let sessionId: String          // Unique session identifier
    let ipAddress: String?         // Client IP address
    let userAgent: String?         // Client user agent
    let isActive: Bool             // Session active status
    let createdAt: Date            // Creation timestamp
    let expiresAt: Date            // Expiration timestamp
    let invalidatedAt: Date?       // Invalidation timestamp
}
```

## 14. AuditLog Model

### Database Schema
```prisma
model AuditLog {
  id         Int      @id @default(autoincrement())
  entityType String
  entityId   String
  action     String
  details    String
  userId     Int?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())
}
```

### Field Mapping cho Swift
```swift
struct AuditLog {
    let id: Int                    // Primary Key
    let entityType: String         // Type of entity (User, Order, etc.)
    let entityId: String           // Entity identifier
    let action: String             // Action performed (CREATE, UPDATE, DELETE)
    let details: String            // Action details (JSON string)
    let userId: Int?               // User who performed action
    let ipAddress: String?         // Client IP address
    let userAgent: String?         // Client user agent
    let createdAt: Date            // Action timestamp
}
```

## Key Notes cho Swift Implementation:

1. **Primary Keys**: Tất cả models sử dụng `Int` làm primary key với auto-increment
2. **Timestamps**: Sử dụng `Date` type cho tất cả datetime fields
3. **Optional Fields**: Sử dụng `?` để đánh dấu optional fields
4. **Enums**: Tạo enums cho các string fields có giá trị cố định (status, role, type)
5. **JSON Fields**: Một số fields chứa JSON data (images, limits, features) - cần xử lý parsing
6. **Relationships**: Các foreign key fields cũng là `Int` type
7. **Default Values**: Một số fields có default values cần được handle trong Swift

## Database Indexing Strategy:
- Email fields có unique constraint
- Status fields được indexed cho performance
- Merchant và outlet relationships được indexed
- Timestamps được indexed cho sorting và filtering
