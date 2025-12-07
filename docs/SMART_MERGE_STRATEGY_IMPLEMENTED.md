# ✅ Smart Merge Strategy - Đã Implement

## 📋 Tổng Quan

Đã implement **Smart Merge Strategy** với critical permissions protection để đảm bảo:
- ✅ Default permissions **không bao giờ bị mất**
- ✅ Custom permissions có thể **THÊM** permissions mới
- ✅ Critical permissions được **bảo vệ** (extra safety)
- ✅ An toàn và dễ maintain

## 🏗️ Kiến Trúc Đã Implement

### **1. Critical Permissions Definition**

```typescript
export const CRITICAL_PERMISSIONS: Record<Role, Permission[]> = {
  'MERCHANT': [
    'merchant.view',
    'outlet.view',
    'products.manage',  // ✅ Critical: Core business function
    'products.view',
    'orders.view',
    'customers.view',
  ],
  // ... other roles
};
```

### **2. Smart Merge Function**

```typescript
function mergePermissionsWithProtection(
  defaultPermissions: Permission[],
  customPermissions: Permission[],
  role: Role
): Permission[] {
  const criticalPermissions = CRITICAL_PERMISSIONS[role] || [];
  
  // Merge: Default + Custom + Critical (union)
  return Array.from(new Set([
    ...defaultPermissions,  // ✅ All default permissions
    ...customPermissions,   // ✅ Custom permissions (additions)
    ...criticalPermissions  // ✅ Critical permissions (extra protection)
  ]));
}
```

### **3. Logic Flow**

```
User Login
  ↓
getUserPermissions(user)
  ↓
Check custom MerchantRole (isSystemRole = true)
  ↓
If exists:
  ↓
  mergePermissionsWithProtection(
    defaultPermissions (from ROLE_PERMISSIONS),
    customPermissions (from MerchantRole),
    role
  )
  ↓
  Result: Default + Custom + Critical (union)
  ↓
  ✅ Merchant có đầy đủ permissions
```

## 🎯 Merge Strategy: ADD (Safe)

### **Strategy: ADD (Default)**

**Logic:**
```typescript
mergedPermissions = [
  ...defaultPermissions,  // ✅ Tất cả default permissions
  ...customPermissions    // ✅ Thêm custom permissions
]
```

**Đặc điểm:**
- ✅ **An toàn nhất**: Không bao giờ mất permissions
- ✅ **Linh hoạt**: Có thể thêm permissions mới
- ✅ **Predictable**: Dễ hiểu và maintain

### **Ví dụ:**

```typescript
// Default MERCHANT permissions (20+ permissions)
defaultPermissions = [
  'merchant.manage',
  'outlet.manage',
  'products.manage',  // ✅ Quan trọng
  'products.view',
  'orders.create',
  // ... 15+ permissions khác
];

// Custom MerchantRole (chỉ có 3 permissions)
customPermissions = [
  'orders.create',
  'orders.view',
  'customers.view'
];

// ✅ KẾT QUẢ SAU KHI MERGE:
mergedPermissions = [
  'merchant.manage',    // ✅ Từ default
  'outlet.manage',      // ✅ Từ default
  'products.manage',    // ✅ Từ default (critical!)
  'products.view',      // ✅ Từ default
  'orders.create',      // ✅ Có trong cả default và custom
  'orders.view',        // ✅ Thêm mới từ custom
  'customers.view',     // ✅ Thêm mới từ custom
  // ... tất cả default permissions khác
];
```

## 📊 So Sánh: Before vs After

### **Before (Override Strategy):**

```typescript
// ❌ OVERRIDE: Chỉ trả về custom permissions
if (customMerchantRole) {
  return customMerchantRole.permissions;  // Chỉ 3 permissions!
}

// ❌ KẾT QUẢ: Merchant MẤT products.manage
```

### **After (Merge Strategy):**

```typescript
// ✅ MERGE: Default + Custom (union)
if (customMerchantRole) {
  return mergePermissionsWithProtection(
    defaultPermissions,
    customPermissions,
    role
  );
}

// ✅ KẾT QUẢ: Merchant có ĐẦY ĐỦ permissions
```

## 🔒 Critical Permissions Protection

### **MERCHANT Critical Permissions:**

```typescript
CRITICAL_PERMISSIONS['MERCHANT'] = [
  'merchant.view',        // Must view own merchant
  'outlet.view',          // Must view outlets
  'products.manage',      // ✅ Critical: Core business function
  'products.view',        // Must view products
  'orders.view',          // Must view orders
  'customers.view',       // Must view customers
];
```

### **OUTLET_ADMIN Critical Permissions:**

```typescript
CRITICAL_PERMISSIONS['OUTLET_ADMIN'] = [
  'outlet.view',          // Must view own outlet
  'products.manage',      // ✅ Critical: Core function
  'products.view',        // Must view products
  'orders.view',          // Must view orders
  'customers.view',       // Must view customers
];
```

## 🎯 Kết Luận

### **✅ Đã Fix:**

1. **Merge Strategy**: Default + Custom (union)
2. **Critical Protection**: Extra safety net
3. **Logging**: Detailed logs để debug
4. **Backward Compatible**: Không breaking changes

### **✅ Kết Quả:**

- ✅ Merchant **luôn có** `products.manage` permission
- ✅ Custom MerchantRole có thể **thêm** permissions mới
- ✅ Default permissions **không bao giờ bị mất**
- ✅ An toàn và predictable

### **📝 Next Steps (Future):**

Nếu cần linh hoạt hơn trong tương lai:

1. **Add mergeStrategy field** vào MerchantRole schema
2. **Support multiple strategies**: ADD, OVERRIDE, INTERSECTION
3. **UI để quản lý** merge strategy

**Nhưng hiện tại, ADD strategy là đủ và tốt nhất!** ✅

