# Refactor API Endpoints to Use withPermissions

## Overview
Refactor priority API endpoints to use permission-based authentication (`withPermissions`) instead of hardcoded roles. This makes the codebase DRY and maintainable by using `ROLE_PERMISSIONS` as the single source of truth.

## Key Concept: Dynamic Permission Checking

### How It Works
1. **User has a role** (e.g., `OUTLET_STAFF`)
2. **`withPermissions(['products.view'])` checks** `ROLE_PERMISSIONS[user.role]`
3. **If permission exists** in role's permissions → access granted ✅
4. **If permission doesn't exist** → access denied (403) ❌

### Example: OUTLET_STAFF Permissions Change

**Before:**
```typescript
// ROLE_PERMISSIONS in packages/auth/src/core.ts
'OUTLET_STAFF': [
  'products.manage',  // Can create/update products
  'products.view'
]
```

**Endpoint code:**
```typescript
export const POST = withPermissions(['products.manage'])(async (request, { user, userScope }) => {
  // OUTLET_STAFF can access ✅
});
```

**After (remove products.manage from OUTLET_STAFF):**
```typescript
// ROLE_PERMISSIONS in packages/auth/src/core.ts
'OUTLET_STAFF': [
  'products.view'  // Only view, cannot manage
]
```

**Same endpoint code (NO CHANGES NEEDED):**
```typescript
export const POST = withPermissions(['products.manage'])(async (request, { user, userScope }) => {
  // OUTLET_STAFF automatically denied ❌
  // No code changes needed! Just update ROLE_PERMISSIONS.
});
```

### Benefits
- ✅ **Single source of truth**: Only update `ROLE_PERMISSIONS` in one place
- ✅ **Automatic updates**: All endpoints automatically reflect permission changes
- ✅ **No code changes**: When permissions change, endpoints work automatically
- ✅ **DRY principle**: No need to hardcode roles in multiple places

## Goals
- Replace hardcoded roles with permission checks
- Use `ROLE_PERMISSIONS` as single source of truth
- Deprecate shortcut functions (withManagementAuth, etc.) but keep them working
- Focus on priority endpoints: products, orders, customers, users

## Phase 1: Deprecate Shortcut Functions ✅

### Files Updated
- `packages/auth/src/unified-auth.ts`

### Changes
- Added `@deprecated` JSDoc comments to shortcut functions
- Functions still work for backward compatibility
- Updated comments to recommend `withPermissions` instead

**Shortcuts deprecated:**
- `withManagementAuth` → Use `withPermissions(['products.manage'])` or specific permission
- `withMerchantAuth` → Use `withPermissions(['merchant.view'])` or specific permission
- `withOutletAuth` → Use `withPermissions(['outlet.view'])` or specific permission
- `withAdminAuth` → Use `withPermissions(['system.manage'])` or specific permission

## Phase 2: Refactor Products Endpoints

### Files Already Done ✅
- ✅ `apps/api/app/api/products/route.ts` - GET endpoint
- ✅ `apps/api/app/api/products/[id]/route.ts` - GET endpoint
- ✅ `apps/api/app/api/products/route.ts` - POST endpoint
- ✅ `apps/api/app/api/products/[id]/route.ts` - PUT/DELETE endpoints
- ✅ `apps/api/app/api/products/export/route.ts` - Export endpoint

### Files to Update
- `apps/api/app/api/products/[id]/availability/route.ts` - Availability endpoint
- `apps/api/app/api/products/availability/route.ts` - Availability endpoint
- `apps/api/app/api/merchants/[id]/products/route.ts` - Merchant products
- `apps/api/app/api/merchants/[id]/products/[productId]/route.ts` - Merchant product detail

### Permission Mapping
- GET (view): `['products.view']` - All roles with this permission can view
- POST (create): `['products.manage']` - Only roles with manage permission
- PUT/PATCH (update): `['products.manage']` - Only roles with manage permission
- DELETE: `['products.manage']` - Only roles with manage permission
- Export: `['products.export']` - Only roles with export permission
- Availability: `['products.view']` - All roles that can view products

## Phase 3: Refactor Orders Endpoints

### Files to Update
- `apps/api/app/api/orders/route.ts` - Main orders endpoint
- `apps/api/app/api/orders/[orderId]/route.ts` - Order detail
- `apps/api/app/api/orders/[orderId]/status/route.ts` - Status update
- `apps/api/app/api/orders/stats/route.ts` - Order statistics
- `apps/api/app/api/orders/export/route.ts` - Export orders
- `apps/api/app/api/orders/by-number/[orderNumber]/route.ts` - Find by order number
- `apps/api/app/api/customers/[id]/orders/route.ts` - Customer orders
- `apps/api/app/api/merchants/[id]/orders/route.ts` - Merchant orders

### Permission Mapping
- GET (view): `['orders.view']` - All roles with view permission
- POST (create): `['orders.create']` - All roles with create permission (includes OUTLET_STAFF)
- PUT/PATCH (update): `['orders.update']` - All roles with update permission (includes OUTLET_STAFF)
- DELETE: `['orders.delete']` - Only roles with delete permission (excludes OUTLET_STAFF)
- Export: `['orders.export']` - Only roles with export permission (excludes OUTLET_STAFF)
- Stats: `['orders.view']` or `['analytics.view']` - View or analytics permission

## Phase 4: Refactor Customers Endpoints

### Files to Update
- `apps/api/app/api/customers/route.ts` - Main customers endpoint
- `apps/api/app/api/customers/[id]/route.ts` - Customer detail
- `apps/api/app/api/customers/[id]/orders/route.ts` - Customer orders (already in Phase 3)

### Permission Mapping
- GET (view): `['customers.view']` - All roles with view permission
- POST (create): `['customers.manage']` - Only roles with manage permission
- PUT/PATCH (update): `['customers.manage']` - Only roles with manage permission
- DELETE: `['customers.manage']` - Only roles with manage permission
- Export: `['customers.export']` - Only roles with export permission (excludes OUTLET_STAFF)

## Phase 5: Refactor Users Endpoints

### Files to Update
- `apps/api/app/api/users/route.ts` - Main users endpoint
- `apps/api/app/api/users/[id]/route.ts` - User detail
- `apps/api/app/api/users/[id]/permissions/route.ts` - User permissions
- `apps/api/app/api/users/permissions/bulk/route.ts` - Bulk permissions
- `apps/api/app/api/merchants/[id]/users/route.ts` - Merchant users
- `apps/api/app/api/merchants/[id]/users/[userId]/route.ts` - Merchant user detail

### Permission Mapping
- GET (view): `['users.view']` - All roles with view permission
- POST (create): `['users.manage']` - Only roles with manage permission
- PUT/PATCH (update): `['users.manage']` - Only roles with manage permission
- DELETE: `['users.manage']` - Only roles with manage permission
- Permissions: `['users.manage']` - Only roles that can manage users

## Implementation Details

### Pattern for Each Endpoint

**Before (hardcoded roles):**
```typescript
export const GET = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN, USER_ROLE.OUTLET_STAFF])(async (request, { user, userScope }) => {
  // If OUTLET_STAFF permissions change, need to update this code
});
```

**After (permission-based):**
```typescript
export const GET = withPermissions(['products.view'])(async (request, { user, userScope }) => {
  // Automatically includes all roles with 'products.view' permission
  // If OUTLET_STAFF permissions change in ROLE_PERMISSIONS, this code doesn't need changes
});
```

### Import Changes
- Replace: `import { withAuthRoles, withManagementAuth } from '@rentalshop/auth';`
- With: `import { withPermissions } from '@rentalshop/auth';`

### Special Cases
- **Admin-only endpoints**: Use `withPermissions(['system.manage'])` or keep `withAuthRoles(['ADMIN'])` if truly admin-only
- **Multiple permissions (OR logic)**: `withPermissions(['permission1', 'permission2'])` - user needs ANY
- **Read-only with subscription bypass**: `withPermissions(['permission'], { requireActiveSubscription: false })`

## How Permissions Are Checked

### Flow Diagram
```
User Request
    ↓
withPermissions(['products.view'])
    ↓
hasAnyPermission(user, ['products.view'])
    ↓
hasPermission(user, 'products.view')
    ↓
Check ROLE_PERMISSIONS[user.role]
    ↓
If 'products.view' in ROLE_PERMISSIONS[user.role] → ✅ Allow
If not → ❌ Deny (403)
```

### Example: OUTLET_STAFF Permission Change

**Scenario:** Remove `products.manage` from OUTLET_STAFF, keep only `products.view`

**Step 1:** Update ROLE_PERMISSIONS
```typescript
// packages/auth/src/core.ts
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  'OUTLET_STAFF': [
    'outlet.view',
    'products.view',  // ✅ Still has view
    // 'products.manage',  // ❌ Removed
    'orders.create', 'orders.view', 'orders.update',
    'customers.view', 'customers.manage'
  ]
};
```

**Step 2:** No code changes needed in endpoints!
```typescript
// apps/api/app/api/products/route.ts
// This endpoint automatically denies OUTLET_STAFF now
export const POST = withPermissions(['products.manage'])(async (request, { user, userScope }) => {
  // OUTLET_STAFF gets 403 automatically
});

// This endpoint still allows OUTLET_STAFF
export const GET = withPermissions(['products.view'])(async (request, { user, userScope }) => {
  // OUTLET_STAFF can still access ✅
});
```

## Testing Checklist
- [ ] Test each endpoint with different user roles
- [ ] Verify OUTLET_STAFF can access view endpoints
- [ ] Verify OUTLET_STAFF cannot access manage/export endpoints
- [ ] Verify error messages are clear
- [ ] Test backward compatibility with deprecated shortcuts
- [ ] Test permission changes: Update ROLE_PERMISSIONS and verify endpoints update automatically

## Estimated Files to Update
- Phase 1: 1 file (unified-auth.ts) ✅
- Phase 2: 7 files (products endpoints) - 5 done, 4 remaining
- Phase 3: 8 files (orders endpoints)
- Phase 4: 2 files (customers endpoints)
- Phase 5: 6 files (users endpoints)

**Total: ~24 files to update**

## Notes
- Keep existing shortcuts working for backward compatibility
- All changes should maintain existing functionality
- Focus on priority endpoints first, can expand later
- Use permission names from `ROLE_PERMISSIONS` in `packages/auth/src/core.ts`
- **Key benefit**: When permissions change in ROLE_PERMISSIONS, all endpoints automatically update without code changes

