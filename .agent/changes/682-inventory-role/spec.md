# Spec — Nhân viên kho (`OUTLET_INVENTORY`)

Issue: #682 · Status: accepted · Intent: ./intent.md

## Behavior

### Role and permissions

1. `UserRole` gains `OUTLET_INVENTORY` (DB enum, `USER_ROLE`, type unions, zod `userRoleEnum`).
   Display: vi "Nhân viên kho", en "Inventory staff", ja "在庫担当", ko "재고 담당", zh "库存员".
2. `ROLE_PERMISSIONS.OUTLET_INVENTORY` = every `OUTLET_STAFF` permission plus `products.manage`,
   `products.create`, `products.update`, `products.export`. Nothing else (no `analytics.view.revenue`,
   `orders.delete`, `orders.export`, `users.*`, `outlet.manage`, `bankAccounts.*`, `customers.export`).
   `CRITICAL_PERMISSIONS.OUTLET_INVENTORY` = staff critical + `products.manage`.
3. Every other role's permission list is byte-for-byte unchanged (test compares against a snapshot).

### Scope (API)

4. Scope is the user's outlet, like `OUTLET_STAFF`: every place that treats `OUTLET_ADMIN` and
   `OUTLET_STAFF` as outlet users (scope filters, `OUTLET_ROLES`, `isOutletTeam`, `withOutletAuth`,
   role lists in `withAuthRoles([...4 roles])`, notifications `ROLES`, `MOBILE_ROLES`,
   `PLAN_LIMIT_USER_ROLES`, middleware `requiredRoles`, calendar scope) includes `OUTLET_INVENTORY`.
5. Where the code hides money or blocks an action for `OUTLET_STAFF` (order delete / batch delete,
   bank accounts, `top-customers.totalSpent`, change history, `blockOutletStaff`), `OUTLET_INVENTORY` is
   treated the same.
6. Products: create, update (prices and `costPrice` kept), delete, restore, batch delete, bulk import,
   export, sync embeddings all succeed for `OUTLET_INVENTORY` on products with stock at its outlet;
   create/update stock rows only at its own outlet (`CANNOT_CREATE_PRODUCT_AT_OTHER_OUTLET`,
   `PRODUCT_NOT_AVAILABLE_AT_OUTLET` as for `OUTLET_ADMIN`); delete of a product without stock at its
   outlet → 403 (the `OUTLET_ADMIN` rule applies to it too). `costPrice` is returned to it.
7. Categories: `POST`, `PUT /api/categories/[id]`, `DELETE /api/categories/[id]` succeed for
   `OUTLET_INVENTORY` within its merchant; another merchant's category → 404/403 as today.
   `GET /api/categories/[id]` returns data for it (outlet-user branch). `OUTLET_ADMIN` unchanged.
8. Staff-level analytics only: `GET /api/analytics/*` answers as for `OUTLET_STAFF` (revenue routes 403
   or daily-only, exactly the staff result).

### Assigning the role

9. `canAssignRole`: `ADMIN`, `OPS`, `MERCHANT`, `OUTLET_ADMIN` may assign `OUTLET_INVENTORY` (same as
   `OUTLET_STAFF`); `OUTLET_STAFF` and `OUTLET_INVENTORY` may not assign anything.
   `POST /api/merchants/[id]/users` applies the same rule.
10. (2026-10-09: on by default.) While env `INVENTORY_ROLE_ENABLED` is `false`, assigning `OUTLET_INVENTORY` (create or update)
    → 400 `ROLE_NOT_AVAILABLE`; existing users keep it. `GET /api/mobile/app-config` adds a top-level
    `inventoryRole: boolean` (additive key; `features` stays screen flags only).
11. A role change to or from `OUTLET_INVENTORY` sets `permissionsChangedAt` and ends sessions (#443).
12. `GET /api/users` for `MERCHANT` / `OUTLET_ADMIN` lists `OUTLET_INVENTORY` users with the staff.
    `OUTLET_ADMIN` may manage `OUTLET_INVENTORY` users of its outlet like staff.

### Web (`apps/client`, `apps/admin`)

13. Add/edit staff: a third role card "Nhân viên kho" (help: "Bán hàng như nhân viên, thêm quản lý sản
    phẩm và danh mục") when app-config `inventoryRole` is on. Staff list, detail and badges show its name.
14. Nav and settings: hidden for it whatever is hidden for `OUTLET_STAFF` (Nhân viên, Chi nhánh, revenue).
    Products, Categories, Import, Export and labels show their manage controls (permission-based).
15. Product form: price and cost fields editable (`canEditPricing` from `products.manage`, no role check
    other than `OUTLET_STAFF`). Category page: add / edit / delete visible.
16. Every web check that hides money or actions for `OUTLET_STAFF` hides them for `OUTLET_INVENTORY`
    (orders detail, orders model, product list model, settings model, role-utils, badges, menus).
17. Admin app: role label and filter include it.

### Mobile (new builds)

18. iOS `User.Role` gains `.outletInventory` (raw `OUTLET_INVENTORY`); login/register mapping keeps it.
    Android `UserRole.OUTLET_INVENTORY`.
19. Products: add, edit (prices), delete visible; categories: add, rename, delete visible.
20. Money hidden and actions blocked exactly as for staff (orders `hidesMoney`, overview, settings rows,
    change history, bank accounts, user form). The mobile Xuất dữ liệu row stays hidden like staff: that screen
    also offers orders and customers, which the role cannot export; product Excel import/export is on the web.
21. Merchant / outlet admin can pick "Nhân viên kho" in the add-user form when app-config `inventoryRole` is on.

### Seed and tests

22. Seed adds `inventory.outlet{n}@example.com / inventory123` per outlet; seed scripts print it.
23. `tests/packages/auth/permissions.test.ts` covers the new role; an API e2e file
    `inventory-role.e2e.test.js` (BF-INV-*) proves 6–12 against a local API.

## Out of scope

- Per-user extra permissions (#548) and custom `MerchantRole` roles.
- Changing `OUTLET_ADMIN` category edit/delete (open question in intent).
- Forcing old app versions to update (`*_MIN_VERSION` is a release decision).
