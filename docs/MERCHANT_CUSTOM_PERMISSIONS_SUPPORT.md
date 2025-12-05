# Merchant-Level Custom Permissions Support

## Tổng quan

Hệ thống **ĐÃ HỖ TRỢ** merchant-level custom permissions cho các roles như `OUTLET_STAFF` và `OUTLET_ADMIN`. Mỗi merchant có thể cấu hình riêng permissions cho từng role.

## Architecture

### 1. MerchantRole Model

**File**: `prisma/schema.prisma`

```prisma
model MerchantRole {
  id           Int       @id @default(autoincrement())
  merchantId   Int
  roleName     String
  isSystemRole Boolean   @default(false)  // true = customize system role (OUTLET_STAFF, OUTLET_ADMIN)
  systemRole   UserRole?                  // System role being customized (OUTLET_STAFF, OUTLET_ADMIN)
  description  String?
  permissions  String[]                   // Custom permissions array
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  merchant     Merchant  @relation(fields: [merchantId], references: [id], onDelete: Cascade)
  users        User[]    // Users assigned to this custom role

  @@unique([merchantId, roleName])
  @@index([merchantId, isSystemRole])
  @@index([systemRole])
}
```

### 2. Permission Resolution Logic

**File**: `packages/auth/src/core.ts`

Function `getUserPermissions()` có priority system:

```typescript
export async function getUserPermissions(user: AuthUser): Promise<Permission[]> {
  // Priority 1: Check if user has a custom role (customRoleId)
  if ((user as any).customRoleId) {
    const merchantRole = await db.prisma.merchantRole.findUnique({
      where: { id: (user as any).customRoleId }
    });
    
    if (merchantRole && merchantRole.isActive && merchantRole.permissions.length > 0) {
      return merchantRole.permissions as Permission[];
    }
  }

  // Priority 2: Check for custom permissions for system role
  // Look for MerchantRole where isSystemRole = true and systemRole matches user's role
  const systemRoleCustomization = await db.prisma.merchantRole.findFirst({
    where: {
      merchantId: user.merchantId,
      isSystemRole: true,
      systemRole: normalizedRole as any,  // OUTLET_STAFF, OUTLET_ADMIN
      isActive: true
    }
  });

  if (systemRoleCustomization && systemRoleCustomization.permissions.length > 0) {
    return systemRoleCustomization.permissions as Permission[];
  }

  // Priority 3: Fallback to default ROLE_PERMISSIONS
  return ROLE_PERMISSIONS[normalizedRole];
}
```

## Use Cases

### Use Case 1: Customize OUTLET_STAFF Permissions for Merchant

**Scenario**: Merchant muốn customize permissions cho tất cả `OUTLET_STAFF` trong merchant của họ.

**Implementation**:

```typescript
// Create MerchantRole với isSystemRole = true
await prisma.merchantRole.create({
  data: {
    merchantId: 123,
    roleName: "Custom OUTLET_STAFF",
    isSystemRole: true,
    systemRole: "OUTLET_STAFF",
    permissions: [
      "outlet.view",
      "products.view",
      "orders.create",
      "orders.view",
      "orders.update",
      "customers.view",
      "customers.manage",
      // ✅ Custom permission: Allow export
      "orders.export"  // Not in default OUTLET_STAFF
    ],
    isActive: true
  }
});
```

**Result**: Tất cả `OUTLET_STAFF` users trong merchant này sẽ có permissions mới, không cần assign custom role cho từng user.

### Use Case 2: Create Custom Role for Specific Users

**Scenario**: Merchant muốn tạo một role mới với permissions riêng và assign cho một số users cụ thể.

**Implementation**:

```typescript
// Create custom role
const customRole = await prisma.merchantRole.create({
  data: {
    merchantId: 123,
    roleName: "Senior Staff",
    isSystemRole: false,  // Custom role, not based on system role
    permissions: [
      "outlet.view",
      "products.manage",
      "products.view",
      "orders.create",
      "orders.view",
      "orders.update",
      "orders.delete",  // More permissions than OUTLET_STAFF
      "customers.manage",
      "customers.view"
    ],
    isActive: true
  }
});

// Assign to specific users
await prisma.user.update({
  where: { id: userId },
  data: {
    customRoleId: customRole.id
  }
});
```

**Result**: User được assign custom role sẽ có permissions từ custom role, không phải từ system role.

### Use Case 3: Merchant-Level OUTLET_ADMIN Customization

**Scenario**: Merchant muốn customize permissions cho tất cả `OUTLET_ADMIN` trong merchant.

**Implementation**:

```typescript
await prisma.merchantRole.create({
  data: {
    merchantId: 123,
    roleName: "Custom OUTLET_ADMIN",
    isSystemRole: true,
    systemRole: "OUTLET_ADMIN",
    permissions: [
      "outlet.manage",
      "outlet.view",
      "users.view",
      "products.manage",
      "products.view",
      "orders.create",
      "orders.view",
      "orders.update",
      "orders.delete",
      "customers.manage",
      "customers.view",
      // ✅ Custom: Remove analytics access
      // "analytics.view"  // Not included
    ],
    isActive: true
  }
});
```

**Result**: Tất cả `OUTLET_ADMIN` users trong merchant này sẽ không có `analytics.view` permission.

## Default Permissions

Nếu merchant không customize, hệ thống sử dụng default permissions từ `ROLE_PERMISSIONS`:

```typescript
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  'OUTLET_STAFF': [
    'outlet.view',
    'products.view',
    'orders.create', 'orders.view', 'orders.update',
    'customers.view', 'customers.manage'
  ],
  'OUTLET_ADMIN': [
    'outlet.manage', 'outlet.view',
    'users.view',
    'products.manage', 'products.view', 'products.export',
    'orders.create', 'orders.view', 'orders.update', 'orders.delete', 'orders.export', 'orders.manage',
    'customers.manage', 'customers.view', 'customers.export',
    'analytics.view'
  ],
  // ... other roles
};
```

## API Endpoints

### 1. Get User Permissions

**GET** `/api/users/[id]/permissions`

Returns current permissions for user (custom or default).

### 2. Update User Permissions

**PUT** `/api/users/[id]/permissions`

Update individual user permissions (creates UserPermission records).

**Note**: Khi update permissions, `permissionsChangedAt` được set để invalidate old tokens.

## Database Schema

### MerchantRole Table

```sql
CREATE TABLE "MerchantRole" (
  "id" SERIAL PRIMARY KEY,
  "merchantId" INTEGER NOT NULL,
  "roleName" TEXT NOT NULL,
  "isSystemRole" BOOLEAN DEFAULT false,
  "systemRole" "UserRole",
  "description" TEXT,
  "permissions" TEXT[],
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MerchantRole_merchantId_roleName_key" UNIQUE ("merchantId", "roleName")
);
```

### User Table

```sql
ALTER TABLE "User" ADD COLUMN "customRoleId" INTEGER;
ALTER TABLE "User" ADD CONSTRAINT "User_customRoleId_fkey" 
  FOREIGN KEY ("customRoleId") REFERENCES "MerchantRole"("id");
```

## Permission Resolution Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User makes API request                                      │
└────────────────────┬────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  getUserPermissions(user)                                    │
└────────────────────┬────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
┌───────────────────┐   ┌───────────────────┐
│ Has customRoleId? │   │ No customRoleId    │
│ YES               │   │ Check system role │
└────────┬──────────┘   │ customization      │
         │              └────────┬───────────┘
         │                       │
         ▼                       ▼
┌───────────────────┐   ┌───────────────────┐
│ Return custom     │   │ Has MerchantRole   │
│ role permissions  │   │ with isSystemRole │
└───────────────────┘   │ = true?            │
                        └────────┬───────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
         ┌───────────────────┐   ┌───────────────────┐
         │ YES: Return custom│   │ NO: Return default│
         │ system role perms │   │ ROLE_PERMISSIONS  │
         └───────────────────┘   └───────────────────┘
```

## Benefits

1. **Flexibility**: Mỗi merchant có thể customize permissions theo nhu cầu
2. **Scalability**: Không cần hardcode permissions cho từng merchant
3. **Backward Compatible**: Default permissions vẫn hoạt động nếu không customize
4. **Granular Control**: Có thể customize system roles hoặc tạo custom roles hoàn toàn mới

## Limitations

1. **Merchant Scope Only**: Custom permissions chỉ áp dụng trong merchant scope
2. **No Cross-Merchant**: Không thể share custom roles giữa các merchants
3. **ADMIN Role**: ADMIN users luôn dùng default permissions (không thể customize)

## Future Enhancements

1. **Role Templates**: Pre-defined role templates cho merchants
2. **Permission Inheritance**: Custom roles có thể inherit từ system roles
3. **Bulk Assignment**: Assign custom roles cho nhiều users cùng lúc
4. **Permission Analytics**: Track permission usage và suggest optimizations

