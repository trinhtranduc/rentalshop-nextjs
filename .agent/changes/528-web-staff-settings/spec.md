# Spec — #528 Cài đặt cửa hàng

Issue: #528 · Status: accepted · Intent: ./intent.md

## Tabs (settings-model)

| Tab (`?tab=`) | Label | Roles |
|---|---|---|
| `merchant` | Thông tin cửa hàng | MERCHANT |
| `outlet` | Chi nhánh của tôi | OUTLET_ADMIN, OUTLET_STAFF |
| `bank-accounts` | Tài khoản ngân hàng | OUTLET_ADMIN |
| `receipt` | In hoá đơn | MERCHANT, OUTLET_ADMIN |
| `subscription` | Gói dịch vụ | MERCHANT |
| `profile` | Tài khoản của tôi | all |
| `account` | Đổi mật khẩu | all |
| `language` | Ngôn ngữ | all |

Default: `merchant` for the owner, `outlet` for outlet users, else `profile`. A tab the role may not open
falls back to the default (URL replaced once the role is known). `loyalty` → `/loyalty`.

## Cards

1. **Thông tin cửa hàng**: tên (required), SĐT, địa chỉ (số nhà đường, thành phố, quận/huyện, quốc gia,
   mã bưu chính), mô tả, đường dẫn cửa hàng (`[a-z0-9-]`), mã số thuế; public product and referral links.
   Huỷ / Lưu enabled only when changed. Below: **Chi nhánh** list (Chính, Đã tắt, address) with
   "Quản lý chi nhánh" → `/outlets` and per-outlet bank accounts. The shop currency follows the UI
   language as before (vi → VND, else USD).
2. **Chi nhánh của tôi**: tên, SĐT, địa chỉ (required), mô tả. OUTLET_STAFF sees it read-only.
3. **Tài khoản ngân hàng**, **Gói dịch vụ**: the shared sections, unchanged, inside `.ar-legacy`.
4. **In hoá đơn**: one note per outlet the caller sees, 500 characters, saved one by one.
5. **Tài khoản của tôi**: họ, tên, SĐT; email read-only.
6. **Đổi mật khẩu**: three fields, checks in the old order (current required, match, ≥ 6) shown under the
   field; then Phiên đăng nhập (Đăng xuất) and Xoá tài khoản behind a confirm dialog.
7. **Ngôn ngữ**: Tiếng Việt / English, stored in the `NEXT_LOCALE` cookie and localStorage.

Light and dark via `ar-*` tokens; at phone width the tab list stacks above the card.
