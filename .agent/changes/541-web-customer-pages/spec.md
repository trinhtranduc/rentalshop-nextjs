# Spec — #541

Issue: #541 · Status: accepted · Intent: ./intent.md

## Shared form (`/customers/add`, `/customers/[id]/edit`)

1. Back link "Khách hàng" (add) / "{name}" (edit, to the profile). h1 "Khách mới" / "Sửa khách".
2. One card, fields with the label above (44px inputs, `ar-*` tokens): Họ tên* · Số điện thoại · Email · Địa chỉ · Thành phố · Tỉnh / bang · Mã bưu chính · Số giấy tờ · Ghi chú (textarea). Country is not shown; on edit its stored value is kept (not sent).
3. Validation (pure, `customer-form-model.ts`): name required and ≥ 2 chars; phone, when given, only digits `+ - ( ) space` and ≥ 8 chars; on edit, phone required if the customer already had one; email format when given. The error shows under the field (red border + text); submit focuses the first bad field.
4. Name split: first word → `firstName`, the rest → `lastName` (same as the old edit form).
5. Create payload: non-empty trimmed fields only. Edit payload: only changed fields (a cleared optional field → `""`); nothing changed → back to the profile without a request.
6. Footer: "Huỷ" (back) and "Lưu khách" / "Lưu thay đổi"; saving shows "Đang lưu…". API failure shows an inline alert: `CUSTOMER_DUPLICATE` → "Số điện thoại hoặc email này đã có ở khách khác.", else "Không lưu được. Thử lại.".
7. After create → `/customers/{newId}` (falls back to `/customers`). After edit → `/customers/{id}`. Success toast.
8. Loading skeleton; not found → "Không tìm thấy khách." + link back.

## Profile (`/customers/[id]`)

1. Back link "Khách hàng". Header: initials avatar, name (or "Khách chưa có tên"), phone · "Khách từ dd/mm/yyyy" (Vietnam day). Actions: call (when phone), "Đơn của khách" (→ orders page), "Sửa" (→ edit, `customers.manage`).
2. Main column: "Liên hệ" card (phone with tel link, email mailto, full address line incl. zip/country, Số giấy tờ, Ghi chú, "Chưa có" placeholders); "Đơn gần đây" card: latest 5 orders as in the list panel (status tag, #number · tạo day, schedule, total; cancelled faded and struck), "Tất cả đơn của khách" link.
3. Side column: stats Số đơn / Đã chi / Đang thuê + "Đã chi không tính đơn huỷ."; "Điểm thưởng" card only when `loyaltyApi.getCustomerSummary` succeeds (points, tier, earned, redeemed, last 5 transactions with Vietnam day); "Xoá khách" (`customers.manage`) → the list's delete dialog, then `/customers`.
4. Loading skeleton; failed / not found → message + back link.

## Customer orders (`/customers/[id]/orders`)

1. Back link "{name}" to the profile. h1 "Đơn của {name}" · total. Action "Tạo đơn" (→ `/orders/create`).
2. Stats row: Số đơn (`total`), Đã chi (`summary.totalAmount`, cancelled excluded), Đang thuê (PICKUPED count).
3. The Đơn hàng table (`OrdersTable` + `buildOrderRow`), newest first, footer with page sizes 10/20/50/100; `page` / `limit` in the URL.
4. Empty: "Khách chưa có đơn nào."; failure: "Không tải được đơn của khách." + "Thử lại".

## Out of scope

`/customers` list and import, `ClientLayout.tsx` (the edit-page full-width exception is removed in the products PR), `packages/**`, API, mobile.
