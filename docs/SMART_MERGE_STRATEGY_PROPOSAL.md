# 🎯 Smart Merge Strategy - Đề Xuất Giải Pháp Tốt Nhất

## 📋 Tổng Quan

Đề xuất giải pháp **Smart Merge Strategy** với nhiều tùy chọn linh hoạt để merge custom permissions với default permissions, đảm bảo:
- ✅ An toàn: Critical permissions không bao giờ bị mất
- ✅ Linh hoạt: Hỗ trợ nhiều merge strategies
- ✅ Dễ maintain: Clear và predictable
- ✅ Backward compatible: Không ảnh hưởng existing data

## 🏗️ Kiến Trúc Giải Pháp

### **1. Thêm Merge Strategy Field vào MerchantRole Schema**

```prisma
model MerchantRole {
  id           Int       @id @default(autoincrement())
  merchantId   Int
  roleName     String
  isSystemRole Boolean   @default(false)
  systemRole   UserRole?
  description  String?
  permissions  String[]
  isActive     Boolean   @default(true)
  
  // ✅ NEW: Merge strategy field
  mergeStrategy String?  @default("ADD")  // "ADD" | "OVERRIDE" | "INTERSECTION" | "CUSTOM"
  
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  merchant     Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  users        User[]

  @@unique([merchantId, roleName])
  @@index([merchantId, isSystemRole])
  @@index([systemRole])
}
```

### **2. Define Critical Permissions cho mỗi Role**

```typescript
// Critical permissions that should NEVER be removed
export const CRITICAL_PERMISSIONS: Record<Role, Permission[]> = {
  'MERCHANT': [
    'merchant.view',        // Must view own merchant
    'outlet.view',          // Must view outlets
    'products.view',        // Must view products
    'orders.view',          // Must view orders
  ],
  'OUTLET_ADMIN': [
    'outlet.view',          // Must view own outlet
    'products.view',        // Must view products
    'orders.view',          // Must view orders
  ],
  'OUTLET_STAFF': [
    'outlet.view',          // Must view own outlet
    'orders.view',          // Must view orders
  ],
  'ADMIN': [] // Admin has no restrictions
};
```

### **3. Merge Strategies**

#### **Strategy 1: ADD (Default - Safe)**
```typescript
// ✅ Chỉ THÊM permissions, không remove default
// Default permissions + Custom permissions (union)
const merged = [...defaultPermissions, ...customPermissions];
```
- ✅ An toàn nhất
- ✅ Không bao giờ mất permissions
- ✅ Có thể thêm permissions mới

#### **Strategy 2: OVERRIDE (Full Control)**
```typescript
// ⚠️ Override hoàn toàn, nhưng protect critical permissions
const criticalPermissions = CRITICAL_PERMISSIONS[role] || [];
const merged = Array.from(new Set([
  ...criticalPermissions,  // ✅ Always include critical
  ...customPermissions     // Custom permissions (may remove non-critical)
]));
```
- ✅ Full control
- ✅ Có thể remove non-critical permissions
- ⚠️ Critical permissions được protect

#### **Strategy 3: INTERSECTION (Restrict)**
```typescript
// ✅ Chỉ giữ permissions có trong CẢ default VÀ custom
const merged = defaultPermissions.filter(p => 
  customPermissions.includes(p)
);
// ✅ Plus critical permissions (always included)
const final = Array.from(new Set([
  ...CRITICAL_PERMISSIONS[role] || [],
  ...merged
]));
```
- ✅ Restrict permissions
- ✅ Chỉ giữ subset của default
- ✅ Critical permissions vẫn được protect

#### **Strategy 4: CUSTOM (Advanced)**
```typescript
// ✅ Custom logic với add/remove lists
// MerchantRole có thêm fields: permissionsToAdd[], permissionsToRemove[]
const merged = [
  ...defaultPermissions.filter(p => !permissionsToRemove.includes(p)),
  ...permissionsToAdd
];
```
- ✅ Full flexibility
- ✅ Explicit add/remove lists
- ✅ Most powerful but complex

## 🎯 Recommended Implementation

### **Phase 1: Simple ADD Strategy (Current - Keep)**

Giữ logic hiện tại (ADD strategy) vì:
- ✅ An toàn nhất
- ✅ Đã implement
- ✅ Không có breaking changes

### **Phase 2: Add Merge Strategy Field (Future)**

Khi cần linh hoạt hơn:

```typescript
export async function getUserPermissions(user: AuthUser): Promise<Permission[]> {
  // ... existing code ...
  
  if (systemRoleCustomization) {
    const defaultPermissions = ROLE_PERMISSIONS[normalizedRole] || [];
    const customPermissions = systemRoleCustomization.permissions as Permission[];
    const mergeStrategy = systemRoleCustomization.mergeStrategy || 'ADD';
    
    return mergePermissions(
      defaultPermissions,
      customPermissions,
      normalizedRole,
      mergeStrategy
    );
  }
}

function mergePermissions(
  defaultPermissions: Permission[],
  customPermissions: Permission[],
  role: Role,
  strategy: 'ADD' | 'OVERRIDE' | 'INTERSECTION'
): Permission[] {
  const critical = CRITICAL_PERMISSIONS[role] || [];
  
  switch (strategy) {
    case 'ADD':
      // Union: Default + Custom
      return Array.from(new Set([...defaultPermissions, ...customPermissions]));
      
    case 'OVERRIDE':
      // Override but protect critical
      return Array.from(new Set([...critical, ...customPermissions]));
      
    case 'INTERSECTION':
      // Only permissions in both default AND custom
      const intersection = defaultPermissions.filter(p => customPermissions.includes(p));
      return Array.from(new Set([...critical, ...intersection]));
      
    default:
      // Default to ADD strategy (safe)
      return Array.from(new Set([...defaultPermissions, ...customPermissions]));
  }
}
```

## 💡 Recommendation

### **Hiện Tại (Immediate)**

✅ **Giữ logic merge hiện tại** (ADD strategy):
- An toàn
- Đã implement
- Không breaking changes

### **Tương Lai (Future Enhancement)**

Khi cần linh hoạt hơn, implement:

1. **Add mergeStrategy field** vào MerchantRole schema
2. **Define CRITICAL_PERMISSIONS** cho mỗi role
3. **Implement mergePermissions function** với multiple strategies
4. **Default to ADD strategy** để backward compatible

### **Migration Path**

```sql
-- Step 1: Add mergeStrategy column (nullable, default 'ADD')
ALTER TABLE "MerchantRole" 
ADD COLUMN "mergeStrategy" TEXT DEFAULT 'ADD';

-- Step 2: Update existing records to use ADD strategy
UPDATE "MerchantRole"
SET "mergeStrategy" = 'ADD'
WHERE "mergeStrategy" IS NULL;

-- Step 3: Make it NOT NULL (after data migration)
ALTER TABLE "MerchantRole"
ALTER COLUMN "mergeStrategy" SET NOT NULL;
```

## 📊 Comparison

| Strategy | Safety | Flexibility | Use Case |
|----------|--------|-------------|----------|
| **ADD** (Current) | ✅✅✅ | ✅✅ | Add permissions, never remove |
| **OVERRIDE** | ⚠️ (with protection) | ✅✅✅ | Full control, remove non-critical |
| **INTERSECTION** | ✅✅ | ✅✅✅ | Restrict to subset |
| **CUSTOM** | ⚠️ | ✅✅✅ | Advanced use cases |

## 🎯 Best Practice

**Default Strategy: ADD**
- ✅ Safe by default
- ✅ Never lose permissions
- ✅ Easy to understand

**Use OVERRIDE only when:**
- Merchant explicitly wants to remove permissions
- Have proper UI to manage it
- Documented clearly

**Use INTERSECTION when:**
- Need to restrict permissions
- Want subset of default permissions

## ✅ Conclusion

**Current Implementation (ADD Strategy) is GOOD for now!**

Future enhancements:
1. Add mergeStrategy field when needed
2. Define critical permissions
3. Support multiple merge strategies
4. Keep ADD as default (safe)

