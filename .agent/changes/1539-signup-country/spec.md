# Spec — #1539

Status: accepted

## API — đăng ký (`POST /api/auth/register`, `POST /api/auth/register/merchant-google`)

1. Body nhận thêm `language` (`vi` | `en`) và `currency` (`VND` | `USD`), tuỳ chọn. Giá trị khác → 400 (zod).
2. Gửi `language`: tên chi nhánh / danh mục mẫu theo `language`; `Merchant.language` = `language`.
3. Gửi `currency`: `Merchant.currency` = `currency`. Không gửi `currency` nhưng có `language`: `vi` → VND, `en` → USD.
4. Không gửi cả hai (app cũ, tab cũ): dữ liệu mẫu và tiền tệ như #1143; `Merchant.language` theo cùng luật tiền tệ
   (ngôn ngữ rõ ràng `vi*` → `vi`, khác → `en`; không có → ngôn ngữ dữ liệu mẫu).
5. `country` (đã có) lưu vào `Merchant.country` và `Outlet.country` như cũ.
6. Email xác thực gửi bằng `Merchant.language` của shop vừa tạo (đăng ký bằng email).

## API — Cài đặt

7. `PUT /api/settings/merchant` nhận `language` (`vi` | `en`): chỉ role `MERCHANT` (khác → 403 `INSUFFICIENT_PERMISSIONS`);
   giá trị khác → 400 `INVALID_INPUT`; body chỉ có `language` thì chỉ đổi nó (không cần tên). Trả về có `language`.
8. `GET /api/users/profile` có `merchant.language` (`vi` | `en`, trống → `vi`).

## Email

9. `sendVerificationEmail` và `sendPasswordResetEmail` nhận `locale` (tuỳ chọn): `en` → tiêu đề và nội dung tiếng Anh
   (ja / ko / zh có bản dịch riêng); không có / lạ → tiếng Việt như hiện nay.
10. Quên mật khẩu, gửi lại email xác thực (2 route), cron nhắc hết hạn, gia hạn, kéo dài gói: gửi theo `language` của shop
    người nhận; không có shop hoặc trống → tiếng Việt.

## Web — form đăng ký (bước 2, email và Google)

11. Có ô **Quốc gia** (mặc định Việt Nam, danh sách mọi nước theo tên ngôn ngữ trang, Việt Nam đứng đầu), **Ngôn ngữ**
    (Tiếng Việt / English), **Tiền tệ** (VND / USD).
12. Đổi quốc gia: Việt Nam → Tiếng Việt + VND; nước khác → English + USD. Sau đó sửa Ngôn ngữ / Tiền tệ được.
13. Gửi lên API `country` (tên tiếng Anh, như Cài đặt và shop đang có), `language`, `currency`, `locale` (như cũ).
14. Đăng ký xong: ngôn ngữ web (`NEXT_LOCALE` + `user_language_preference`) = ngôn ngữ đã chọn; khác ngôn ngữ trang thì tải lại cả trang
    để trang kế tiếp (xác thực email / dashboard) hiện đúng ngôn ngữ. Dữ liệu đăng nhập không đổi (golden #1459); Cài đặt đọc
    lại profile khi user lưu trên máy chưa có `merchant.language`.

## Web — Cài đặt

15. Thông tin cửa hàng: chủ shop thấy **Ngôn ngữ email** (Tiếng Việt / English) dưới Tiền tệ; lưu qua `PUT /api/settings/merchant`.
    Vai trò khác không thấy.
16. Khổ 390px không tràn ngang (form đăng ký và Cài đặt).

## Out of scope

iOS / Android, giá gói cho nước ngoài, admin.
