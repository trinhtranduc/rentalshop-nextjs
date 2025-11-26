<!-- 7f167245-d19f-4007-a692-133617968f58 33cc9643-b612-4758-ab62-72ab086f1b90 -->
# Role Permission Template Infrastructure

## Mục tiêu

Tạo cấu trúc quản lý permissions template theo role cho OUTLET_STAFF, cho phép admin cấu hình permissions theo module và lưu template. **KHÔNG enforce permissions ngay**, chỉ tạo infrastructure để sau này dễ thay đổi.

## Phạm vi

- **Scope**: Chỉ OUTLET_STAFF trong scope của user hiện tại
- **Default permissions**: Vẫn giữ `ROLE_PERMISSIONS` trong `packages/auth/src/core.ts`
- **Template storage**: Lưu riêng trong database, không ảnh hưởng default

## Default Permissions cho các Role

Các role **OUTLET_ADMIN** và **OUTLET_STAFF** đã có permissions mặc định được định nghĩa trong `ROLE_PERMISSIONS` constant:

### OUTLET_ADMIN Default Permissions
```typescript
'OUTLET_ADMIN': [
  'outlet.view',
  'users.view',
  'products.manage', 'products.view', 'products.export',
  'orders.create', 'orders.view', 'orders.update', 'orders.delete', 'orders.export', 'orders.manage',
  'customers.manage', 'customers.view', 'customers.export',
  'analytics.view'
]
```

### OUTLET_STAFF Default Permissions
```typescript
'OUTLET_STAFF': [
  'outlet.view',
  'products.view', // ❌ NO products.export, products.manage
  'orders.create', 'orders.view', 'orders.update', // ❌ NO orders.delete, orders.export, orders.manage
  'customers.view', 'customers.manage' // ❌ NO customers.export
]
```

**Lưu ý**: Các permissions này là **mặc định** và được sử dụng trong `hasPermission()` function. Page view sẽ hiển thị các permissions này để admin có thể xem và hiểu cấu trúc permissions của từng role.

## Implementation Plan

### 1. Database Schema - Role Permission Template

**File**: `prisma/schema.prisma`

Tạo model `RolePermissionTemplate`:

- `role`: UserRole (OUTLET_STAFF)
- `merchantId`: Optional (null for ADMIN, có giá trị cho MERCHANT/OUTLET_ADMIN)
- `outletId`: Optional (null for MERCHANT/ADMIN, có giá trị cho OUTLET_ADMIN)
- `permissions`: JSON array lưu danh sách permissions
- Unique constraint: `[role, merchantId, outletId]`

### 2. Cập nhật Permission Types (Mở rộng)

**File**: `packages/auth/src/core.ts`

Thêm permissions mới vào type definition (chưa enforce):

- `orders.cancel`
- `products.create`, `products.update`, `products.delete`
- `customers.create`, `customers.update`, `customers.delete`

### 3. API Endpoint - Template Management

**File**: `apps/api/app/api/users/permissions/template/route.ts`

- **GET**: Lấy template cho OUTLET_STAFF trong scope
- Nếu có template: trả về từ database
- Nếu không: trả về default từ `ROLE_PERMISSIONS`
- **PUT**: Lưu template vào database
- **POST**: Apply template cho tất cả OUTLET_STAFF trong scope (optional)

### 4. Permission View Page (View Only - Không có logic save/update)

**File**: `apps/client/app/users/permissions/page.tsx`

**Mục đích**: Page để xem permissions mặc định theo role, hiển thị dạng checkboxes (disabled/read-only)

**UI Components**:

- **Role Selector**: Dropdown để chọn role muốn xem (OUTLET_ADMIN, OUTLET_STAFF)
- **Scope Info**: Hiển thị scope hiện tại của user (merchant/outlet)
- **Permission Groups**: Hiển thị permissions theo module với checkboxes (disabled state)
  - Dữ liệu được lấy trực tiếp từ `ROLE_PERMISSIONS[role]` trong `packages/auth/src/core.ts`
  - Checkboxes được checked/unchecked dựa trên permissions mặc định của role

**Permission Display cho OUTLET_ADMIN**:
  - **Outlet Module**:
    - ☑️ `outlet.view`
  - **Users Module**:
    - ☑️ `users.view`
  - **Products Module**:
    - ☑️ `products.manage`
    - ☑️ `products.view`
    - ☑️ `products.export`
  - **Orders Module**:
    - ☑️ `orders.create`
    - ☑️ `orders.view`
    - ☑️ `orders.update`
    - ☑️ `orders.delete`
    - ☑️ `orders.export`
    - ☑️ `orders.manage`
  - **Customers Module**:
    - ☑️ `customers.manage`
    - ☑️ `customers.view`
    - ☑️ `customers.export`
  - **Dashboard Module**:
    - ☑️ `analytics.view`

**Permission Display cho OUTLET_STAFF**:
  - **Outlet Module**:
    - ☑️ `outlet.view`
  - **Users Module**:
    - ☐ (không có permissions)
  - **Products Module**:
    - ☐ `products.manage` (unchecked)
    - ☑️ `products.view`
    - ☐ `products.export` (unchecked)
  - **Orders Module**:
    - ☑️ `orders.create`
    - ☑️ `orders.view`
    - ☑️ `orders.update`
    - ☐ `orders.delete` (unchecked)
    - ☐ `orders.export` (unchecked)
    - ☐ `orders.manage` (unchecked)
  - **Customers Module**:
    - ☑️ `customers.manage`
    - ☑️ `customers.view`
    - ☐ `customers.export` (unchecked)
  - **Dashboard Module**:
    - ☐ `analytics.view` (unchecked)

**Dữ liệu nguồn**: Lấy từ `ROLE_PERMISSIONS` constant trong `packages/auth/src/core.ts`

**Behavior**:
- ✅ Hiển thị checkboxes với checked/unchecked state dựa trên `ROLE_PERMISSIONS[role]`
- ✅ Tất cả checkboxes đều **disabled** (read-only)
- ✅ Không có Save button
- ✅ Không có Update logic
- ✅ Chỉ để xem và hiểu cấu trúc permissions mặc định của từng role
- ✅ Khi chọn role khác, permissions sẽ tự động cập nhật theo `ROLE_PERMISSIONS` của role đó

### 4b. Permission View Component

**File**: `packages/ui/src/components/features/Users/components/PermissionRoleView.tsx`

**Component hiển thị permissions mặc định theo role**:

- **Props**:
  - `role`: UserRole (OUTLET_ADMIN | OUTLET_STAFF)
  - `permissions`: Permission[] (từ ROLE_PERMISSIONS[role])
- **Features**:
  - Dropdown/Selector để chọn role (OUTLET_ADMIN, OUTLET_STAFF)
  - Hiển thị permissions theo module với checkboxes (disabled)
  - Dữ liệu lấy từ `ROLE_PERMISSIONS[role]` constant (permissions mặc định)
  - Group permissions theo module (Outlet, Users, Products, Orders, Customers, Dashboard)
  - Visual indicator cho checked/unchecked state dựa trên permissions mặc định
  - Hiển thị tất cả permissions có thể có, nhưng chỉ check những permissions mà role có

**Example Usage**:
```tsx
import { ROLE_PERMISSIONS } from '@rentalshop/auth';

<PermissionRoleView 
  role="OUTLET_STAFF" 
  permissions={ROLE_PERMISSIONS.OUTLET_STAFF}
/>
```

**Implementation Notes**:
- Component sẽ nhận `role` và tự động lấy `permissions` từ `ROLE_PERMISSIONS[role]`
- Hiển thị tất cả permissions có thể có trong hệ thống
- Check những permissions có trong `ROLE_PERMISSIONS[role]`
- Uncheck những permissions không có trong `ROLE_PERMISSIONS[role]`
- Tất cả checkboxes đều disabled (read-only)

### 5. Permission Template Manager Component (Future - Not in this phase)

**File**: `packages/ui/src/components/features/Users/components/PermissionTemplateManager.tsx`

**Note**: Component này sẽ được implement trong phase sau khi cần enforce permissions.

Module groups:

- **Orders**: create, view, update, delete, export, cancel
- **Products**: create, view, update, delete, export
- **Customers**: create, view, update, delete, export
- **Dashboard**: analytics.view

### 6. API Client Methods (Future - Not in this phase)

**File**: `packages/utils/src/api/users.ts`

**Note**: Các methods này sẽ được implement trong phase sau.

- `getRolePermissionTemplate(role, scope)`
- `updateRolePermissionTemplate(role, permissions, scope)`
- `applyRolePermissionTemplate(role, scope)`

### 7. Helper Functions (Future-ready)

**File**: `packages/auth/src/core.ts`

- `getRolePermissionTemplate(role, scope)` - Lấy template từ DB hoặc default
- **Lưu ý**: Chưa dùng trong `hasPermission()`, chỉ tạo sẵn

### 8. Documentation

**File**: `docs/PERMISSION_TEMPLATE_SYSTEM.md`

Giải thích cấu trúc và kế hoạch enforce trong tương lai.

## Files to Create (Phase 1 - View Only)

1. `apps/client/app/users/permissions/page.tsx` - Permission view page (view only)
2. `packages/ui/src/components/features/Users/components/PermissionRoleView.tsx` - Permission view component

## Files to Create (Phase 2 - Future)

1. `prisma/schema.prisma` - Thêm RolePermissionTemplate model
2. `apps/api/app/api/users/permissions/template/route.ts` - Template API
3. `packages/ui/src/components/features/Users/components/PermissionTemplateManager.tsx` - UI component
4. `docs/PERMISSION_TEMPLATE_SYSTEM.md` - Documentation

## Files to Modify (Phase 1 - View Only)

1. `packages/auth/src/core.ts` - Thêm permissions mới vào type definition (nếu cần)
2. `packages/ui/src/components/features/Users/index.ts` - Export PermissionRoleView component

## Files to Modify (Phase 2 - Future)

1. `packages/utils/src/api/users.ts` - Thêm API client methods

## Implementation Phases

### Phase 1: View Only Page (Current)
- ✅ Tạo page `/users/permissions` để view permissions mặc định theo role
- ✅ Component `PermissionRoleView` hiển thị checkboxes (disabled)
- ✅ Dữ liệu từ `ROLE_PERMISSIONS` constant (permissions mặc định)
- ✅ Hiển thị permissions mặc định của OUTLET_ADMIN và OUTLET_STAFF
- ✅ Không có save/update logic
- ✅ Chỉ để xem và hiểu cấu trúc permissions mặc định của từng role

### Phase 2: Template Infrastructure (Future)
- Tạo database schema cho RolePermissionTemplate
- API endpoints cho template management
- PermissionTemplateManager component với save/update logic

### Phase 3: Enforce Permissions (Future)
- Integrate template vào `hasPermission()` function
- Auto-apply template khi tạo user mới
- Permission enforcement trong API routes

## Notes

- **Phase 1 chỉ focus vào view**: Không implement database, API, hay save logic
- **Checkboxes là disabled**: Chỉ để visualize permissions, không thể thay đổi
- **Data source**: `ROLE_PERMISSIONS` constant từ `packages/auth/src/core.ts`
- **Default permissions**: OUTLET_ADMIN và OUTLET_STAFF đã có permissions mặc định được định nghĩa trong `ROLE_PERMISSIONS`
- **View only**: Page chỉ để xem permissions mặc định, không thể thay đổi
- **Future phases**: Sẽ implement template management và enforcement sau
- **Permission structure**: Các permissions được group theo module (Outlet, Users, Products, Orders, Customers, Dashboard)

