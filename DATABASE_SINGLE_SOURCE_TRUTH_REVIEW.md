# 🔍 Database Single Source of Truth Review

**Date:** 2025-10-14  
**Status:** ✅ **VERIFIED - COMPLIANT**

## **✅ SUMMARY**

All database models follow **Single Source of Truth (SSOT)** principle correctly. No duplicate or redundant fields detected.

---

## **📋 DETAILED ANALYSIS**

### **1. ✅ MERCHANT MODEL**

```prisma
model Merchant {
  id                 Int           @id @default(autoincrement())
  name               String
  email              String        @unique
  // ... other merchant fields
  planId             Int?          // ✅ Reference to Plan
  subscription       Subscription? // ✅ 1:1 relationship
  // ❌ subscriptionStatus REMOVED (was duplicate of subscription.status)
}
```

**Status:** ✅ **COMPLIANT**
- **Removed:** `subscriptionStatus` field (duplicate)
- **Single Source:** `subscription.status` is the only source of truth
- **Relationship:** 1:1 with `Subscription`

---

### **2. ✅ SUBSCRIPTION MODEL**

```prisma
model Subscription {
  id                 Int       @id @default(autoincrement())
  merchantId         Int       @unique  // ✅ 1:1 with Merchant
  planId             Int                // ✅ Reference to Plan
  status             String    @default("trial") // ✅ SINGLE SOURCE OF TRUTH
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
  amount             Float
  // ... other fields
}
```

**Status:** ✅ **COMPLIANT**
- **Single Source:** `status` field is the authoritative source
- **No Duplication:** No redundant status fields in related models
- **Clear Ownership:** 1:1 relationship with Merchant

---

### **3. ✅ PLAN MODEL**

```prisma
model Plan {
  id            Int      @id @default(autoincrement())
  name          String   @unique
  basePrice     Float
  limits        String   // JSON: outlets, users, products, customers
  features      String   // JSON array
  isActive      Boolean  @default(true)
  // ... other fields
}
```

**Status:** ✅ **COMPLIANT**
- **No Duplication:** Plan data is not duplicated in Subscription
- **Reference Only:** Subscription references Plan via `planId`
- **Single Source:** Plan details are always fetched from Plan table

---

### **4. ✅ ORDER MODEL**

```prisma
model Order {
  id                Int       @id @default(autoincrement())
  orderNumber       String    @unique
  orderType         String    // RENT, SALE
  status            String    @default("RESERVED") // ✅ SINGLE SOURCE
  totalAmount       Float     // ✅ Calculated field (stored for performance)
  depositAmount     Float     @default(0)
  // ... other fields
  orderItems        OrderItem[]
  payments          Payment[]
}
```

**Status:** ✅ **COMPLIANT**
- **Single Source:** `status` field is authoritative
- **Calculated Fields:** `totalAmount` is stored (denormalized for performance, acceptable)
- **No Status Duplication:** Order status is not duplicated in OrderItem or Payment

**Note:** Denormalization of `totalAmount` is **acceptable** for performance. It's recalculated on updates.

---

### **5. ✅ ORDER ITEM MODEL**

```prisma
model OrderItem {
  id         Int     @id @default(autoincrement())
  quantity   Int     @default(1)
  unitPrice  Float   // ✅ Snapshot at order time
  totalPrice Float   // ✅ Calculated (quantity * unitPrice)
  deposit    Float   @default(0)
  orderId    Int
  productId  Int     // ✅ Reference to Product
}
```

**Status:** ✅ **COMPLIANT**
- **Price Snapshot:** `unitPrice` is a snapshot (not duplicate)
- **Calculated Field:** `totalPrice` is calculated (acceptable)
- **Product Reference:** Product details fetched from Product table

**Note:** Price snapshot is **necessary** for historical accuracy (prices change over time).

---

### **6. ✅ PRODUCT MODEL**

```prisma
model Product {
  id          Int      @id @default(autoincrement())
  name        String
  totalStock  Int      @default(0)  // ✅ Aggregate of OutletStock
  rentPrice   Float
  salePrice   Float?
  // ... other fields
  outletStock OutletStock[]
}
```

**Status:** ✅ **COMPLIANT**
- **Aggregate Field:** `totalStock` is sum of all OutletStock (acceptable for performance)
- **No Duplication:** Product details are not duplicated in OutletStock
- **Single Source:** Product data is authoritative

**Note:** `totalStock` is an **aggregate field** updated when OutletStock changes (denormalization for performance).

---

### **7. ✅ OUTLET STOCK MODEL**

```prisma
model OutletStock {
  id        Int      @id @default(autoincrement())
  stock     Int      @default(0)  // ✅ SINGLE SOURCE for outlet inventory
  available Int      @default(0)  // ✅ Calculated (stock - renting)
  renting   Int      @default(0)  // ✅ Count of items currently rented
  productId Int
  outletId  Int
}
```

**Status:** ✅ **COMPLIANT**
- **Single Source:** `stock` is the authoritative inventory count
- **Calculated Field:** `available = stock - renting` (acceptable)
- **No Duplication:** Inventory is not duplicated in Product

**Note:** `available` is a **calculated field** updated when stock or renting changes.

---

### **8. ✅ PAYMENT MODEL**

```prisma
model Payment {
  id             Int      @id @default(autoincrement())
  amount         Float
  status         String   @default("PENDING") // ✅ SINGLE SOURCE
  method         String
  type           String   // ORDER, SUBSCRIPTION
  orderId        Int?
  subscriptionId Int?
  merchantId     Int?
}
```

**Status:** ✅ **COMPLIANT**
- **Single Source:** `status` field is authoritative
- **Polymorphic:** Can be linked to Order OR Subscription (not both)
- **No Duplication:** Payment details are not duplicated in Order/Subscription

---

### **9. ✅ USER MODEL**

```prisma
model User {
  id         Int       @id @default(autoincrement())
  email      String    @unique
  role       String    @default("OUTLET_STAFF") // ✅ SINGLE SOURCE
  isActive   Boolean   @default(true)
  merchantId Int?      // ✅ Reference to Merchant
  outletId   Int?      // ✅ Reference to Outlet
}
```

**Status:** ✅ **COMPLIANT**
- **Single Source:** `role` and `isActive` are authoritative
- **No Duplication:** User role is not duplicated in Merchant/Outlet
- **Clear Ownership:** User belongs to Merchant and/or Outlet

---

### **10. ✅ CUSTOMER MODEL**

```prisma
model Customer {
  id         Int      @id @default(autoincrement())
  firstName  String
  lastName   String
  email      String?
  phone      String   // ✅ Required, unique per merchant
  merchantId Int      // ✅ Reference to Merchant
  isActive   Boolean  @default(true)
}
```

**Status:** ✅ **COMPLIANT**
- **Single Source:** Customer data is authoritative
- **No Duplication:** Customer details are not duplicated in Order
- **Unique Constraint:** `@@unique([merchantId, phone])` prevents duplicates

---

## **🎯 KEY FINDINGS**

### **✅ COMPLIANT PATTERNS**

1. **Subscription Status** - ✅ Fixed
   - `merchant.subscriptionStatus` **REMOVED**
   - `subscription.status` is **SINGLE SOURCE OF TRUTH**

2. **Price Snapshots** - ✅ Acceptable
   - `OrderItem.unitPrice` stores price at order time
   - Necessary for historical accuracy

3. **Calculated Fields** - ✅ Acceptable
   - `Order.totalAmount` (performance optimization)
   - `OutletStock.available` (stock - renting)
   - **Rule:** Always recalculated on updates

4. **Aggregate Fields** - ✅ Acceptable
   - `Product.totalStock` (sum of OutletStock)
   - **Rule:** Updated when child records change

---

## **📊 DENORMALIZATION RULES**

### **When Denormalization is Acceptable:**

1. **Performance Optimization**
   - ✅ `Order.totalAmount` (avoid recalculating on every query)
   - ✅ `Product.totalStock` (avoid summing OutletStock on every query)

2. **Historical Accuracy**
   - ✅ `OrderItem.unitPrice` (prices change over time)
   - ✅ `OrderItem.deposit` (deposit rules change over time)

3. **Calculated Fields**
   - ✅ `OutletStock.available` (derived from stock - renting)

### **When to Avoid Duplication:**

1. **❌ Status Fields**
   - **Bad:** `merchant.subscriptionStatus` (duplicate of `subscription.status`)
   - **Good:** Single `subscription.status` field

2. **❌ Reference Data**
   - **Bad:** Copying plan details into subscription
   - **Good:** Store `planId` and fetch plan data when needed

3. **❌ User Data**
   - **Bad:** Storing user role in multiple places
   - **Good:** Single `user.role` field

---

## **🔒 VALIDATION RULES**

### **1. Update Calculated Fields**
```typescript
// ✅ GOOD: Update available when stock changes
await prisma.outletStock.update({
  where: { id },
  data: {
    stock: newStock,
    available: newStock - renting  // Recalculate
  }
});
```

### **2. Update Aggregate Fields**
```typescript
// ✅ GOOD: Update product totalStock when outlet stock changes
await prisma.product.update({
  where: { id: productId },
  data: {
    totalStock: {
      increment: stockChange  // Update aggregate
    }
  }
});
```

### **3. Never Duplicate Status**
```typescript
// ❌ BAD: Duplicate status in merchant
await prisma.merchant.update({
  data: { subscriptionStatus: 'active' }  // WRONG!
});

// ✅ GOOD: Single source of truth
await prisma.subscription.update({
  data: { status: 'active' }  // Correct!
});
```

---

## **✅ CONCLUSION**

**Database Schema Status:** ✅ **FULLY COMPLIANT**

### **Summary:**
- ✅ **No duplicate status fields**
- ✅ **All relationships use references (IDs)**
- ✅ **Calculated fields are clearly defined**
- ✅ **Denormalization is justified and documented**
- ✅ **Single source of truth principle is enforced**

### **Key Achievement:**
- **Removed `merchant.subscriptionStatus`** - eliminated data duplication
- **Established `subscription.status`** as single source of truth
- **All database queries updated** to use correct source

### **Maintenance Guidelines:**
1. **Never add duplicate status fields**
2. **Always use references (foreign keys)**
3. **Document all calculated/aggregate fields**
4. **Update calculated fields on source changes**
5. **Prefer normalization over denormalization**

---

**🎉 Database schema is now clean, efficient, and follows best practices!**

