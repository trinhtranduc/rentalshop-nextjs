# Đăng ký chọn quốc gia, ngôn ngữ, tiền tệ; email theo ngôn ngữ shop

Issue: #1539 · Author: Trinh Tran · Status: accepted · Created: 2026-11-13

## Problem

Màn tạo tài khoản web không hỏi shop ở nước nào. Ngôn ngữ dữ liệu mẫu và tiền tệ lấy ngầm theo ngôn ngữ trang (#1143):
chủ shop không thấy, không chọn. Email luôn tiếng Việt: email xác thực và đặt lại mật khẩu viết cứng tiếng Việt, email
gói dịch vụ có bản tiếng Anh nhưng không ai truyền ngôn ngữ, và shop không lưu ngôn ngữ ở đâu cả.

## Proposed outcome

- Bước 2 "Thông tin cửa hàng" của form đăng ký (email và Google) có **Quốc gia** (mặc định Việt Nam, mọi nước),
  **Ngôn ngữ** (Tiếng Việt / English) và **Tiền tệ** (VND / USD). Việt Nam → Tiếng Việt + VND; nước khác → English + USD;
  sửa được.
- Một ô Ngôn ngữ dùng cho: email gửi shop, tên chi nhánh / danh mục mẫu, ngôn ngữ web sau khi đăng ký.
- Shop lưu ngôn ngữ ở `Merchant.language` (`vi` / `en`, trống = tiếng Việt). Email xác thực, đặt lại mật khẩu, nhắc hết
  hạn, gia hạn, kéo dài gói theo ngôn ngữ đó.
- Cài đặt web → Thông tin cửa hàng: chủ shop đổi **Ngôn ngữ email** (cạnh Tiền tệ).

## Affected users and systems

Chủ shop mới đăng ký trên web; chủ shop đang có (Cài đặt). `POST /api/auth/register`, `POST /api/auth/register/merchant-google`,
`PUT /api/settings/merchant`, `GET /api/users/profile`, các route gửi email (quên mật khẩu, gửi lại xác thực, cron nhắc hết hạn,
gia hạn, kéo dài), `packages/utils` email, `packages/ui` RegisterForm, `apps/client` Cài đặt, `prisma`.

## Constraints

- Additive: trường mới đều tuỳ chọn; app đã cài không gửi → như cũ (#1143). Migration chỉ thêm cột cho phép trống.
- Shop đang có: `language` trống → email tiếng Việt như hiện nay.
- 2 ngôn ngữ (vi, en), 2 tiền tệ (VND, USD) như hiện có.
- Giữ đơn giản: không đổi ngôn ngữ trang đăng ký ngay khi chọn; áp dụng sau khi đăng ký.

## Out of scope

- iOS / Android: màn đăng ký (gửi múi giờ máy, quốc gia, ngôn ngữ) và ô Ngôn ngữ email trong Cài đặt app — issue sau.
- Giá gói và cách thanh toán cho shop nước ngoài.
- Admin hiện / sửa ngôn ngữ shop.

## Decision log

- 2026-11-13 — owner chọn: web trước; một ô Ngôn ngữ cho tất cả; đổi Ngôn ngữ email trong Cài đặt web; cột mới `Merchant.language`.
- 2026-11-13 — quốc gia mặc định Việt Nam theo lời owner ("default là việt nam còn lại tiếng anh"), kể cả khi trang đang tiếng Anh.
- 2026-11-13 — quốc gia lưu mã ISO 2 chữ (`VN`, `US`) vào `Merchant.country` và `Outlet.country` (cột đã có; `resolveOnboardingLocaleFromContext` đọc mã).
