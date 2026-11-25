# Spec #1648

Status: in-progress

1. `emailLanguageFor({ country, language })`: quốc gia (bỏ dấu, hoa thường, tên tiếng Anh hoặc tiếng Việt, hoặc mã `VN` / `JP`): Việt Nam → `vi`, Nhật Bản → `ja`, mọi nước khác không trống → `en`; quốc gia trống → `shopLanguage(language)` (trống → `vi`).
2. Xác thực email (đăng ký, gửi lại, xác thực xong), quên mật khẩu, nhắc hết hạn gói (cron), gia hạn, kéo dài gói dùng `emailLanguageFor` của shop người nhận. Không có shop → `vi` như cũ.
3. `GET /api/users/profile`: `merchant.language` = `emailLanguageFor` (kiểu `vi|en|ja` không đổi).
4. `PUT /api/settings/merchant { language }` vẫn nhận và lưu như cũ (403 role khác, 400 giá trị lạ); trả `language` = ngôn ngữ đang dùng.
5. Web, iOS, Android: không còn dòng "Ngôn ngữ email" và đoạn chú thích dưới nó, ở Thông tin cửa hàng của chủ shop.
6. Đăng ký (#1545) không đổi: vẫn gửi `language` và `country`; email xác thực đầu tiên theo quốc gia vừa chọn.

Ngoài phạm vi: bỏ cột, đổi nội dung email, thêm ngôn ngữ ngoài vi / en / ja.
