# Delete Strategy for Rental Shop

## 🎯 Overview

This document defines the complete delete strategy for all entities in the rental shop system.

## 📋 Delete Strategy by Entity

### 1. **Category** - HARD DELETE with Dependency Check
- **Type**: Physical deletion from database
- **Check**: Has products?
- **Implementation**: 
  ```typescript
  const productCount = await db.products.getStats({ categoryId });
  if (productCount > 0) {
    throw new Error('Cannot delete category with products');
  }
  await prisma.category.delete({ where: { id } });
  ```
- **Exception**: Default category (`isDefault: true`) cannot be deleted
- **Status**: ✅ Implemented

### 2. **Product** - SOFT DELETE (Always)
- **Type**: Logical deletion (`isActive: false`)
- **Check**: None (can always soft delete)
- **Implementation**:
  ```typescript
  await prisma.product.update({
    where: { id },
    data: { isActive: false }
  });
  ```
- **Reason**: 
  - OrderItem has product snapshot (productName, productBarcode)
  - Order history remains intact even after product deletion
  - Can restore product if needed
- **Status**: ✅ Implemented

### 3. **Customer** - SOFT DELETE with Active Orders Check
- **Type**: Logical deletion (`isActive: false`)
- **Check**: Has active orders (RESERVED, PICKUPED)?
- **Implementation**:
  ```typescript
  const activeOrders = await db.orders.getStats({
    customerId,
    status: { in: ['RESERVED', 'PICKUPED'] }
  });
  if (activeOrders > 0) {
    throw new Error('Cannot delete customer with active orders');
  }
  await db.customers.update(id, { isActive: false });
  ```
- **Reason**: Keep customer data for completed order history
- **Status**: ✅ Implemented

### 4. **Order** - NO DELETE
- **Type**: Cannot be deleted
- **Check**: N/A
- **Implementation**: No delete endpoint
- **Reason**: 
  - Permanent transaction records
  - Financial audit trail
  - Legal/tax compliance
- **Status**: ✅ Implemented (no delete function)

### 5. **Payment** - NO DELETE
- **Type**: Cannot be deleted
- **Check**: N/A
- **Implementation**: No delete endpoint
- **Reason**:
  - Financial records
  - Audit trail
  - Accounting compliance
- **Status**: ✅ Implemented (no delete function)

### 6. **User** - SOFT DELETE with Activity Check
- **Type**: Logical deletion (`deletedAt: timestamp`)
- **Check**: Has created orders or activities?
- **Implementation**:
  ```typescript
  // User already uses deletedAt field (not isActive)
  await db.users.update(id, { 
    deletedAt: new Date(),
    isActive: false 
  });
  ```
- **Reason**: 
  - Audit trail for user activities
  - Order history (createdBy)
  - GDPR compliance (mark as deleted, keep for records)
- **Status**: ⚠️ Need to review current implementation

### 7. **Outlet** - SOFT DELETE with Default Check
- **Type**: Logical deletion (`isActive: false`)
- **Check**: Is default outlet?
- **Implementation**:
  ```typescript
  if (outlet.isDefault) {
    throw new Error('Cannot delete default outlet');
  }
  await db.outlets.update(id, { isActive: false });
  ```
- **Reason**:
  - Business location history
  - Order history per outlet
  - Analytics and reporting
- **Status**: ✅ Implemented

### 8. **Merchant** - SOFT DELETE (Cascade)
- **Type**: Logical deletion (`isActive: false`)
- **Check**: Has active subscriptions or business operations?
- **Implementation**:
  ```typescript
  // Check for active subscriptions
  const activeSubscription = await db.subscriptions.findFirst({
    merchantId,
    status: { in: ['ACTIVE', 'TRIAL'] }
  });
  
  if (activeSubscription) {
    // Cancel subscription first
    await db.subscriptions.update(activeSubscription.id, { 
      status: 'CANCELLED' 
    });
  }
  
  await db.merchants.update(id, { isActive: false });
  ```
- **Reason**:
  - All business data (outlets, users, products, orders)
  - Financial history
  - Subscription history
- **Status**: ⚠️ Need to implement subscription check

### 9. **Subscription** - SOFT DELETE (Status Change)
- **Type**: Status change to CANCELLED
- **Check**: Already cancelled?
- **Implementation**:
  ```typescript
  await db.subscriptions.update(id, { 
    status: 'CANCELLED',
    cancelledAt: new Date()
  });
  ```
- **Reason**:
  - Billing history
  - Revenue tracking
  - Analytics
- **Status**: ✅ Implemented (via status change)

### 10. **Plan** - SOFT DELETE with Subscription Check
- **Type**: Logical deletion (`isActive: false`)
- **Check**: Has active subscriptions?
- **Implementation**:
  ```typescript
  const activeSubscriptions = await db.subscriptions.getStats({
    planId,
    status: { in: ['ACTIVE', 'TRIAL'] }
  });
  
  if (activeSubscriptions > 0) {
    throw new Error('Cannot delete plan with active subscriptions');
  }
  
  await db.plans.update(id, { isActive: false });
  ```
- **Reason**: Keep plan history for past subscriptions
- **Status**: ⚠️ Need to implement

## 🔐 Delete Protection Rules

### Cannot Delete If:
1. **Category**: Has any products (active or inactive)
2. **Product**: Never prevent (always allow soft delete)
3. **Customer**: Has active orders (RESERVED, PICKUPED)
4. **User**: Has active sessions or is the last admin
5. **Outlet**: Is default outlet (`isDefault: true`)
6. **Merchant**: Has active business operations (should deactivate instead)
7. **Plan**: Has active subscriptions
8. **Order**: Never allow delete
9. **Payment**: Never allow delete

### Default Entities Protection:
- ✅ **Default Outlet** (`isDefault: true`) - Cannot delete or disable
- ✅ **Default Category** (`isDefault: true`) - Cannot delete or disable

## 📊 Implementation Checklist

- [x] Category - Hard delete with product check
- [x] Product - Soft delete (always allowed)
- [x] Customer - Soft delete with active orders check
- [ ] User - Review and update delete logic
- [x] Outlet - Soft delete with default check
- [ ] Merchant - Add subscription check
- [ ] Plan - Add active subscription check
- [x] Order - No delete (already implemented)
- [x] Payment - No delete (already implemented)
- [ ] Subscription - Implement cancellation (status change)

## 🔄 Product Snapshot Implementation

### OrderItem Schema:
```prisma
model OrderItem {
  productId       Int?     // Nullable - can delete product
  productName     String   // Snapshot: name at order time
  productBarcode  String?  // Snapshot: barcode at order time
  product         Product? @relation(onDelete: SetNull)
}
```

### Benefits:
- ✅ Products can be deleted without breaking order history
- ✅ Order items always show product name
- ✅ No referential integrity issues
- ✅ Complete audit trail

## 🎯 Summary

| Entity | Delete Type | Dependency Check | Keep After Delete |
|--------|-------------|------------------|-------------------|
| Category | Hard | Products | ❌ Removed |
| Product | Soft | None | ✅ isActive: false |
| Customer | Soft | Active Orders | ✅ isActive: false |
| Order | None | N/A | ✅ Always keep |
| Payment | None | N/A | ✅ Always keep |
| User | Soft | Sessions | ✅ deletedAt |
| Outlet | Soft | Is Default | ✅ isActive: false |
| Merchant | Soft | Subscription | ✅ isActive: false |
| Plan | Soft | Active Subs | ✅ isActive: false |
| Subscription | Status | None | ✅ CANCELLED |

## 🚀 Migration

Migration file created: `20251018103706_add_product_snapshot_to_order_items`

This will:
1. Add `productName` and `productBarcode` columns to OrderItem
2. Populate existing records with current product data
3. Make `productId` nullable
4. Update foreign key to SET NULL on product deletion

