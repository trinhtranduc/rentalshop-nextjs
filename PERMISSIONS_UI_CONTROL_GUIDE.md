# Permissions-Based UI Control Guide

## Tổng quan

Hệ thống đã được cập nhật để sử dụng **permissions-based UI control** thay vì hardcode role checks. Điều này cho phép:

- ✅ **Linh hoạt hơn**: Thay đổi permissions không cần sửa code UI
- ✅ **Bảo mật tốt hơn**: Permissions được kiểm tra ở cả backend và frontend
- ✅ **Dễ bảo trì**: Single source of truth từ `ROLE_PERMISSIONS` trong backend

## Cấu trúc giải pháp

### 1. Backend - Login API trả về Permissions

**File**: `apps/api/app/api/auth/login/route.ts`

```typescript
// ✅ Get user permissions (supports custom merchant permissions)
const authUserForPermissions = {
  id: user.id,
  email: user.email,
  role: user.role,
  merchantId: user.merchantId,
  outletId: user.outletId,
};
const permissions = await getUserPermissions(authUserForPermissions as any);

// ✅ Include permissions in response
const result = {
  success: true,
  code: 'LOGIN_SUCCESS',
  message: 'Login successful',
  data: {
    user: {
      // ... other fields
      permissions: permissions, // Array of permission strings
    },
    token,
  },
};
```

**Permissions được trả về**:
- Dựa trên `ROLE_PERMISSIONS` trong `packages/auth/src/core.ts`
- Hỗ trợ custom merchant permissions nếu có
- Format: `['products.manage', 'orders.create', 'customers.view', ...]`

### 2. Frontend - User Type với Permissions

**File**: `packages/types/src/entities/user.ts`

```typescript
export interface User extends BaseEntityWithMerchant {
  // ... other fields
  permissions?: string[]; // ✅ Array of permission strings
}
```

### 3. Frontend - usePermissions Hook

**File**: `packages/hooks/src/hooks/usePermissions.ts`

Hook mới để check permissions trên frontend:

```typescript
import { usePermissions } from '@rentalshop/hooks';

function MyComponent() {
  const { 
    hasPermission, 
    hasAnyPermission, 
    hasAllPermissions,
    canManageProducts,
    canCreateOrders,
    // ... other convenience methods
  } = usePermissions();

  // Check single permission
  if (hasPermission('products.manage')) {
    return <Button>Add Product</Button>;
  }

  // Check multiple permissions (OR logic)
  if (hasAnyPermission(['products.manage', 'products.view'])) {
    return <ProductList />;
  }

  // Check multiple permissions (AND logic)
  if (hasAllPermissions(['products.manage', 'products.export'])) {
    return <ExportButton />;
  }

  // Use convenience methods
  if (canManageProducts) {
    return <ProductManagementPanel />;
  }
}
```

**Available Methods**:
- `hasPermission(permission: Permission)`: Check single permission
- `hasAnyPermission(permissions: Permission[])`: Check if user has ANY permission (OR)
- `hasAllPermissions(permissions: Permission[])`: Check if user has ALL permissions (AND)
- `canManageProducts`: Convenience method for `products.manage`
- `canViewProducts`: Convenience method for `products.view`
- `canExportProducts`: Convenience method for `products.export`
- `canManageOrders`, `canCreateOrders`, `canUpdateOrders`, `canDeleteOrders`, `canViewOrders`, `canExportOrders`
- `canManageCustomers`, `canViewCustomers`, `canExportCustomers`
- `canManageUsers`, `canViewUsers`
- `canManageOutlets`, `canViewOutlets`
- `canManageMerchants`, `canViewMerchants`
- `canViewAnalytics`
- `canManageBilling`, `canViewBilling`

### 4. UI Components - Sử dụng Permissions

**Ví dụ: ProductTable**

```typescript
import { usePermissions } from '@rentalshop/hooks';

export function ProductTable({ products, onProductAction }: ProductTableProps) {
  // ✅ Use permissions hook
  const { canManageProducts, canViewProducts } = usePermissions();

  return (
    <DropdownMenuContent>
      {/* ✅ View - Available if user can view products */}
      {canViewProducts && (
        <DropdownMenuItem onClick={() => onProductAction('view', product.id)}>
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </DropdownMenuItem>
      )}
      
      {/* ✅ Edit - Only available if user can manage products */}
      {canManageProducts && (
        <DropdownMenuItem onClick={() => onProductAction('edit', product.id)}>
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </DropdownMenuItem>
      )}
      
      {/* ✅ Delete - Only available if user can manage products */}
      {canManageProducts && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => onProductAction('delete', product.id)}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </>
      )}
    </DropdownMenuContent>
  );
}
```

## Permissions Mapping

### Role → Permissions

**OUTLET_STAFF** (Limited permissions):
```typescript
[
  'outlet.view',
  'products.view',           // ✅ Can view products
  'orders.create',           // ✅ Can create orders
  'orders.view',             // ✅ Can view orders
  'orders.update',           // ✅ Can update orders
  'customers.view',          // ✅ Can view customers
  'customers.manage'         // ✅ Can manage customers
]
// ❌ NO: products.manage, products.export, orders.delete, orders.export
```

**OUTLET_ADMIN**:
```typescript
[
  'outlet.view',
  'users.view',
  'products.manage',         // ✅ Can manage products
  'products.view',
  'products.export',
  'orders.create',
  'orders.view',
  'orders.update',
  'orders.delete',
  'orders.export',
  'orders.manage',
  'customers.manage',
  'customers.view',
  'customers.export',
  'analytics.view'
]
```

**MERCHANT**:
```typescript
[
  'merchant.view',
  'outlet.manage',
  'outlet.view',
  'users.manage',
  'users.view',
  'products.manage',
  'products.view',
  'products.export',
  'orders.create',
  'orders.view',
  'orders.update',
  'orders.delete',
  'orders.export',
  'orders.manage',
  'customers.manage',
  'customers.view',
  'customers.export',
  'analytics.view',
  'billing.view'
]
```

**ADMIN** (Full access):
```typescript
[
  'system.manage',
  'system.view',
  'merchant.manage',
  'merchant.view',
  'outlet.manage',
  'outlet.view',
  'users.manage',
  'users.view',
  'products.manage',
  'products.view',
  'products.export',
  'orders.create',
  'orders.view',
  'orders.update',
  'orders.delete',
  'orders.export',
  'orders.manage',
  'customers.manage',
  'customers.view',
  'customers.export',
  'analytics.view',
  'billing.manage',
  'billing.view'
]
```

## Components đã được cập nhật

### ✅ Products
- `ProductTable`: Ẩn/hiện Edit, Delete dựa trên `products.manage`
- `ProductActions`: Ẩn/hiện Add Product, Import, Bulk Edit dựa trên `products.manage`
- `ProductActions`: Ẩn/hiện Export dựa trên `products.export`

### ✅ Categories
- `CategoryTable`: Ẩn/hiện Edit, Delete dựa trên `products.manage`
- `CategoryActions`: Ẩn/hiện Add Category, Import, Bulk Edit dựa trên `products.manage`
- `CategoryActions`: Ẩn/hiện Export dựa trên `products.export`

## Cách sử dụng trong components mới

### Pattern 1: Conditional Rendering

```typescript
import { usePermissions } from '@rentalshop/hooks';

function MyComponent() {
  const { canManageProducts } = usePermissions();

  return (
    <div>
      {canManageProducts && (
        <Button onClick={handleAddProduct}>
          Add Product
        </Button>
      )}
    </div>
  );
}
```

### Pattern 2: Disable Button

```typescript
function MyComponent() {
  const { canManageProducts } = usePermissions();

  return (
    <Button 
      onClick={handleSave}
      disabled={!canManageProducts}
    >
      Save Product
    </Button>
  );
}
```

### Pattern 3: Multiple Permissions

```typescript
function MyComponent() {
  const { hasAnyPermission } = usePermissions();

  return (
    <div>
      {hasAnyPermission(['products.manage', 'products.view']) && (
        <ProductList />
      )}
    </div>
  );
}
```

## Best Practices

1. **Luôn sử dụng permissions thay vì role checks**:
   ```typescript
   // ❌ BAD
   if (user.role === 'OUTLET_STAFF') {
     return null;
   }

   // ✅ GOOD
   const { canManageProducts } = usePermissions();
   if (!canManageProducts) {
     return null;
   }
   ```

2. **Sử dụng convenience methods khi có thể**:
   ```typescript
   // ✅ GOOD
   const { canManageProducts } = usePermissions();
   if (canManageProducts) { ... }

   // ❌ BAD (unnecessary)
   const { hasPermission } = usePermissions();
   if (hasPermission('products.manage')) { ... }
   ```

3. **Kiểm tra permissions ở cả backend và frontend**:
   - Frontend: Ẩn/hiện UI elements
   - Backend: Thực sự kiểm tra permissions trong API endpoints

## Migration Checklist

Khi cập nhật components cũ:

- [ ] Thay thế `user.role === 'OUTLET_STAFF'` bằng `usePermissions()`
- [ ] Thay thế `canManageProducts(user)` bằng `canManageProducts` từ hook
- [ ] Thay thế `useUserRole()` bằng `usePermissions()` nếu chỉ cần check permissions
- [ ] Đảm bảo backend API cũng check permissions (đã có sẵn với `withPermissions`)

## Testing

Để test permissions:

1. Login với user có role `OUTLET_STAFF`
2. Kiểm tra:
   - ✅ Không thấy nút "Add Product"
   - ✅ Không thấy nút "Edit Product" trong dropdown
   - ✅ Không thấy nút "Delete Product"
   - ✅ Vẫn thấy nút "View Details"
   - ✅ Vẫn thấy nút "View Orders"

3. Login với user có role `OUTLET_ADMIN`:
   - ✅ Thấy tất cả các nút
   - ✅ Có thể thêm/sửa/xóa products

## Troubleshooting

**Vấn đề**: Permissions không hiển thị đúng
- **Giải pháp**: Kiểm tra login response có chứa `permissions` array không
- **Kiểm tra**: `user.permissions` trong localStorage sau khi login

**Vấn đề**: TypeScript error về permissions
- **Giải pháp**: Rebuild TypeScript: `yarn build` hoặc restart TypeScript server

**Vấn đề**: UI vẫn hiển thị buttons mặc dù không có permission
- **Giải pháp**: Đảm bảo đã import và sử dụng `usePermissions()` hook

## Tài liệu tham khảo

- Backend Permissions: `packages/auth/src/core.ts` - `ROLE_PERMISSIONS`
- Permission Types: `packages/auth/src/core.ts` - `Permission` type
- usePermissions Hook: `packages/hooks/src/hooks/usePermissions.ts`
- User Type: `packages/types/src/entities/user.ts`

