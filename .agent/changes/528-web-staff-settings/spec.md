# Spec — #528 Cài đặt cửa hàng

Issue: #528 · Status: accepted · Intent: ./intent.md

## Tabs (settings-model)

| Tab (`?tab=`) | Label | Roles |
|---|---|---|
| `merchant` | Thông tin cửa hàng | MERCHANT |
| `outlet` | Thông tin chi nhánh | OUTLET_ADMIN, OUTLET_STAFF |
| `bank-accounts` | Tài khoản ngân hàng | OUTLET_ADMIN |
| `receipt` | Phiếu in | MERCHANT, OUTLET_ADMIN |
| `subscription` | Gói dịch vụ | MERCHANT |
| `profile` | Tài khoản của tôi | all |
| `account` | Đổi mật khẩu | all |
| `language` | Ngôn ngữ | all |

Default: `merchant` for the owner, `outlet` for outlet users, else `profile`. A tab the role may not open
falls back to the default (URL replaced once the role is known). `loyalty` → `/loyalty`.

## Cards

1. **Thông tin cửa hàng**: tên (required), SĐT, địa chỉ (số nhà đường, thành phố, quận/huyện, quốc gia,
   mã bưu chính), email (read-only), mã URL cửa hàng (`[a-z0-9-]`), mã số thuế, mô tả; read-only without
   `merchant.manage`. Huỷ / Lưu enabled only when changed. Below: **Chi nhánh** list (Chính badge, address,
   phone) with "Thêm chi nhánh" / "Sửa" → `/outlets` and per-outlet bank accounts, then the public
   product and referral links (copy / open). The shop currency follows the UI
   language as before (vi → VND, else USD).
2. **Thông tin chi nhánh**: tên (required), SĐT, địa chỉ (required), mô tả: the fields `PUT /api/settings/outlet`
   stores (it ignores city / state / zip / country); read-only without `outlet.manage` (staff). Share links below.
3. **Tài khoản ngân hàng**, **Gói dịch vụ**: the shared sections, unchanged, inside `.ar-legacy`.
4. **Phiếu in**: one note per outlet the caller sees, 500 characters, saved one by one.
5. **Tài khoản của tôi**: họ, tên, SĐT; email read-only.
6. **Đổi mật khẩu**: three fields, checks in the old order (current required, match, ≥ 6) shown as the old
   error toasts; then Phiên đăng nhập (Đăng xuất) and Xoá tài khoản behind a confirm dialog.
7. **Ngôn ngữ**: Tiếng Việt / English, stored in the `NEXT_LOCALE` cookie and localStorage.

Light and dark via `ar-*` tokens; at phone width the tab list stacks above the card.

## Thông báo

- Bell panel (board Thong-bao): pill tabs Tất cả / Chưa đọc · n, rows grouped by Vietnam day with the weekday
  ("HÔM NAY · T3 06/10"), an icon per event (new order, handed over, returned, completed, cancelled), unread rows
  tinted with a dot and bold title, a row opens `/orders/<orderNumber>` and marks it read, "Đã đọc hết",
  ⋯ menu (Xem tất cả, Xoá thông báo đã đọc), footer "Xem tất cả thông báo" → `/notifications`.
- `/notifications`: same rows, `?tab=unread`, per-row Đánh dấu đã đọc / chưa đọc, Xem thêm (30 per page).
- The board's "late" and "money received" rows have no inbox event in the API (gap, not invented).

## Nhân viên

- OUTLET_STAFF sees a no-access note (the API refuses `users.view` anyway). Merchants get outlet chips with a
  head-count; outlet admins are scoped to their outlet by the API. Role / status filters, search and paging in the URL.
- The signed-in owner is pinned first ("Đang dùng"), since the API returns outlet roles only.
- "Sửa" → `/users/[id]`, ⋯ → khoá / mở khoá / xoá (themed confirm), "Thêm nhân viên" → `/users/add`,
  role card links `/users/role-permissions` and `/users/permissions`.
- "Đăng nhập gần nhất" reads `lastLoginAt`, which login does not update today (shows "—"; gap).

## Dark dialogs

`ShopShell` adds `html.ar-shell`; `globals.css` gives every portal child of `<body>` (Radix dialogs, toasts,
select menus) the dark tokens and overrides for the hard-coded light classes while the shell is dark. The
receipt slip (`[data-receipt-content]`) stays white paper because it is what prints.
