# Spec — #542 Phân quyền and Quyền theo vai trò

Issue: #542 · Status: accepted · Intent: ./intent.md

## Behavior

1. `/users/permissions` renders without a page error for MERCHANT and OUTLET_ADMIN.
2. OUTLET_STAFF (and any role other than ADMIN / MERCHANT / OUTLET_ADMIN) sees "Tài khoản nhân viên không
   xem được …" style no-access note; no request is made.
3. Left card "Chọn nhân viên": outlet staff from `GET /api/users?role=OUTLET_STAFF&limit=100` (API scopes
   to the merchant / outlet), each a checkbox row (avatar, name, contact, outlet). "Chọn tất cả" / "Bỏ chọn".
   Empty list → "Chưa có nhân viên nào".
4. Right card per module (Đơn hàng, Sản phẩm, Khách hàng, Nhân viên, Tổng quan) with the same 7 keys as the
   old page: `orders.export`, `orders.delete`, `products.export`, `customers.export`, `users.view`,
   `users.manage`, `analytics.view`. Each a switch with label + one-line description. Per module "Bật hết" /
   "Tắt hết".
5. With nothing picked the switches are disabled and the card says to pick staff first.
6. With exactly one staff picked the switches load from `GET /api/users/{id}/permissions` (enabled rows on,
   the rest off). With several picked they start from all off.
7. Lưu → `POST {API}/api/users/permissions/bulk` via `authenticatedFetch` with `userIds` and **every** key
   with its boolean (`permissionPayload`). Success toast "Đã lưu quyền cho n nhân viên"; error toast from the
   API message.
8. Header link "Xem quyền từng vai trò" → `/users/role-permissions`; back link → `/users`.
9. `/users/role-permissions`: role pills Quản lý chi nhánh / Nhân viên (`?role=` not needed, local state),
   one card per module listing every permission of the old view with a check (granted by default) or a dash
   (not granted), from `ROLE_PERMISSIONS`. Note: these are defaults; extra permissions are on Phân quyền.
   Link "Phân quyền thêm cho nhân viên" → `/users/permissions`. OUTLET_STAFF: no-access note.
10. Light and dark via `ar-*` tokens only; 390px has no horizontal scroll (cards stack).

## Out of scope

- Making per-user permissions affect access (auth reads role defaults + MerchantRole only).
- Editing role defaults (`MerchantRole`).

## API and data

None changed. Numeric user ids only.

## Acceptance

- [ ] `tests/web-users-permissions.test.ts` (both TZ)
- [ ] tsc: the three TS errors in `users/permissions/page.tsx` are gone, no new ones
- [ ] Browser: both pages, MERCHANT + OUTLET_ADMIN, light/dark, 1440/390, 0 page errors
- [ ] New strings in `locales/{en,vi}/users.json` under `web` (ja/ko/zh have no `web` block and fall back)
