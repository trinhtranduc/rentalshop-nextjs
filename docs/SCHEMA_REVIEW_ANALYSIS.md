# 📊 Schema Review Analysis: Product, Outlet, User

## 🔍 Phân tích chi tiết các models

---

## 1. 📦 **PRODUCT Model**

### Current Schema:
```prisma
model Product {
  id             Int           @id @default(autoincrement())
  name           String        // ✅ Required
  description    String?       // ✅ Optional
  barcode        String?       @unique // ✅ Optional
  totalStock     Int           @default(0) // ✅ Required (default 0)
  rentPrice      Float         // ✅ Required
  salePrice      Float?        // ✅ Optional
  deposit        Float         @default(0) // ✅ Required (default 0)
  images         Json?         // ✅ Optional
  isActive       Boolean       @default(true) // ✅ Required (default true)
  createdAt      DateTime      @default(now()) // ✅ Required
  updatedAt      DateTime      @updatedAt // ✅ Required
  merchantId     Int           // ✅ Required
  categoryId     Int           // ✅ Required
  costPrice      Float?        // ✅ Optional
  pricingType    PricingType?  // ✅ Optional
  durationConfig String?       // ✅ Optional
}
```

### Frontend Validation:
- ✅ `name`: Required (validated)
- ✅ `categoryId`: Required (validated)
- ✅ `rentPrice`: Required, must be > 0 (validated)
- ✅ `salePrice`: Optional (validated if provided)
- ✅ `totalStock`: Required, must be >= 0 (validated)
- ✅ `deposit`: Required, must be >= 0 (validated)
- ✅ `description`: Optional
- ✅ `barcode`: Optional

### ✅ **RECOMMENDATION: NO CHANGES NEEDED**
**Reason:** Schema matches frontend validation perfectly. All required fields are properly marked, and optional fields are nullable.

---

## 2. 🏪 **OUTLET Model**

### Current Schema:
```prisma
model Outlet {
  id           Int           @id @default(autoincrement())
  name         String        // ✅ Required
  address      String?       // ✅ Optional
  description  String?       // ✅ Optional
  isActive     Boolean       @default(true) // ✅ Required (default true)
  isDefault    Boolean       @default(false) // ✅ Required (default false)
  createdAt    DateTime      @default(now()) // ✅ Required
  updatedAt    DateTime      @updatedAt // ✅ Required
  merchantId   Int           // ✅ Required
  phone        String?       // ✅ Optional
  city         String?       // ✅ Optional
  country      String?       // ✅ Optional
  state        String?       // ✅ Optional
  zipCode      String?       // ✅ Optional
  avatar       String?       // ✅ Optional
}
```

### Frontend Validation:
- ✅ `name`: Required (validated)
- ✅ `address`: Optional
- ✅ `phone`: Optional
- ✅ `description`: Optional
- ✅ All address fields: Optional

### ✅ **RECOMMENDATION: NO CHANGES NEEDED**
**Reason:** Schema matches frontend validation perfectly. Only `name` is required, all other fields are optional.

---

## 3. 👤 **USER Model**

### Current Schema:
```prisma
model User {
  id                     Int                    @id @default(autoincrement())
  email                  String                 @unique // ✅ Required
  password               String                 // ✅ Required
  firstName              String                 // ⚠️ Required in DB, but frontend allows empty
  lastName               String                 // ⚠️ Required in DB, but frontend allows empty
  phone                  String?                // ✅ Optional
  role                   UserRole               @default(OUTLET_STAFF) // ✅ Required
  customRoleId           Int?                   // ✅ Optional
  isActive               Boolean                @default(true) // ✅ Required
  emailVerified          Boolean                @default(false) // ✅ Required
  emailVerifiedAt        DateTime?              // ✅ Optional
  passwordChangedAt      DateTime?              // ✅ Optional
  createdAt              DateTime               @default(now()) // ✅ Required
  updatedAt              DateTime               @updatedAt // ✅ Required
  merchantId             Int?                   // ✅ Optional (depends on role)
  outletId               Int?                   // ✅ Optional (depends on role)
  deletedAt              DateTime?              // ✅ Optional
}
```

### Frontend Validation:
- ✅ `email`: Required (validated)
- ✅ `password`: Required (validated)
- ⚠️ `firstName`: **Frontend allows empty string** (validation: "optional - only validate if provided")
- ⚠️ `lastName`: **Frontend allows empty string** (validation: "optional - only validate if provided")
- ✅ `phone`: Optional (validated if provided)
- ✅ `role`: Required (validated)
- ✅ `merchantId`: Optional (depends on role)
- ✅ `outletId`: Optional (depends on role)

### ⚠️ **ISSUE FOUND: firstName và lastName**

**Problem:**
- Database schema: `firstName String`, `lastName String` (required, not nullable)
- Frontend validation: Allows empty strings for firstName and lastName
- Current code: Uses `firstName: z.string().min(1).or(z.literal(''))` - allows empty string
- **This will cause the same issue as Customer model!**

### ✅ **RECOMMENDATION: Make firstName and lastName nullable**

**Change:**
```prisma
model User {
  // ... other fields
  firstName              String?   // Change to optional (nullable)
  lastName               String?   // Change to optional (nullable)
  // ... other fields
}
```

**Reason:**
1. Frontend allows empty firstName/lastName
2. Business logic: Some users might not have full names
3. Consistency: Same pattern as Customer model
4. Unique constraint `@@unique([merchantId, phone])` already handles nullable phone correctly

---

## 📋 **SUMMARY & ACTION ITEMS**

### ✅ **NO CHANGES NEEDED:**
1. **Product Model** - Perfect alignment
2. **Outlet Model** - Perfect alignment

### ⚠️ **CHANGES NEEDED:**
1. **User Model** - Make `firstName` and `lastName` nullable

### 🔧 **Implementation Steps:**

1. **Update User Schema:**
   ```prisma
   firstName              String?   // Change from String to String?
   lastName               String?   // Change from String to String?
   ```

2. **Update User Database Functions:**
   - `createUser()`: Convert empty strings to null
   - `updateUser()`: Convert empty strings to null
   - `simplifiedUsers.create()`: Convert empty strings to null
   - `simplifiedUsers.update()`: Convert empty strings to null

3. **Create Migration:**
   ```bash
   yarn db:migrate:dev --name make_user_firstname_lastname_nullable
   ```

4. **Test:**
   - Create user with only email (no firstName/lastName)
   - Update user to remove firstName/lastName
   - Verify unique constraints still work

---

## 🎯 **CONSISTENCY CHECK**

After changes, all models will follow the same pattern:

| Model | Required Fields | Optional Fields |
|-------|----------------|-----------------|
| **Customer** | `firstName` | `lastName?`, `phone?`, `email?`, address fields |
| **User** | `email`, `password` | `firstName?`, `lastName?`, `phone?`, `merchantId?`, `outletId?` |
| **Product** | `name`, `rentPrice`, `categoryId`, `merchantId` | `description?`, `barcode?`, `salePrice?`, `costPrice?` |
| **Outlet** | `name`, `merchantId` | `address?`, `phone?`, `description?`, address fields |

**✅ All models will be consistent and aligned with frontend validation!**

