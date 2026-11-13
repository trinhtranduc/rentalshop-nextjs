# Spec — app đăng ký quốc gia / ngôn ngữ / tiền tệ

Status: in-review

1. Bước "Cửa hàng", sau Địa chỉ, trước "Bạn cho thuê gì": Quốc gia, rồi một hàng Ngôn ngữ + Tiền tệ, rồi dòng ghi chú
   "Ngôn ngữ dùng cho email và dữ liệu mẫu. Cả hai đổi được sau trong Cài đặt."
2. Mặc định Việt Nam / Tiếng Việt / VND. Chọn nước: Việt Nam → vi + VND, khác → en + USD. Sau đó đổi tay Ngôn ngữ / Tiền tệ được.
3. Danh sách quốc gia: 249 mã ISO (giống `ISO_COUNTRY_CODES` của web), tên theo ngôn ngữ app, Việt Nam đầu, còn lại theo tên;
   có ô tìm (không dấu, không phân biệt hoa thường).
4. Đăng ký gửi thêm `country` = tên tiếng Anh (CLDR; HK, CN, MO, IO, GS theo tên web lưu), `language`, `currency`, `timezone` = múi giờ máy.
   Giá trị cũ giữ nguyên.
5. Quay lại bước 1 từ bước 2: các ô giữ giá trị đã chọn.
6. Cài đặt → Thông tin cửa hàng: chủ shop (role MERCHANT) thấy "Ngôn ngữ email" (Tiếng Việt / English) khi profile có
   `merchant.language`; chọn khác → `PUT /api/settings/merchant { language }`; lỗi → báo, giữ giá trị cũ. Vai trò khác không thấy.
7. Chuỗi mới có tiếng Việt và tiếng Anh.

## Out of scope

Đổi quốc gia sau khi đăng ký trong app, giá gói cho nước ngoài.
