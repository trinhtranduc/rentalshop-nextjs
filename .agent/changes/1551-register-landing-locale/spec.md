# Spec — #1551

Status: in-progress

1. `registerLocaleFromLanding(appCookie, publicCookie)`: `null` khi `appCookie` có giá trị, hoặc `publicCookie` không phải
   ngôn ngữ public; `vi` khi `publicCookie` = `vi`; `en` cho mọi ngôn ngữ public khác (`en`, `ja`, `ko`, `zh`, `zh-TW`, `ru`, `fr`, `de`, `th`, `id`, `es`).
2. Middleware, đường dẫn `/register`, `/register/step-1`, `/register/step-2` (có hoặc không `/` cuối): khi hàm trên trả ngôn ngữ,
   request đi tiếp mang thêm cookie `NEXT_LOCALE=<ngôn ngữ>` (layout đọc ngay lần tải này) và response lưu
   `NEXT_LOCALE` (path `/`, `sameSite: lax`, 1 năm). Khi trả `null`: đi tiếp như cũ, không ghi cookie.
3. `config.matcher` có thêm `/register` và `/register/:path*`. Các đường dẫn khác (`/login`, `/registered`, `/register-x`) không đổi.
4. Kết quả: khách từ landing English vào `/register` thấy `lang="en"`, dòng nhắc "Currency VND · Emails in English · change in Settings.",
   và đăng ký xong trang xác thực email cũng English.

## Out of scope

- Thêm ngôn ngữ cho trang quản lý; đổi ngôn ngữ trang đăng nhập; đoán theo `Accept-Language` khi không có cookie landing.
