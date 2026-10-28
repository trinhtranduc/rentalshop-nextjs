# Intent — 3 lỗi API từ e2e tích hợp (#1215)

- **Vì sao:** e2e app cũ (main-real) với API dev tìm ra 3 lỗi: Android cũ crash khi `salePrice` null; app cũ lưu sản phẩm BLOCK tạo dòng FIXED trùng; spec #1199 ghi sai mã lỗi.
- **Mong muốn:** sửa tối giản, chỉ thêm, không đổi nghĩa field app cũ đọc. Chủ: "đơn giản và chuẩn".
- **Ràng buộc:** không migration dữ liệu production; chỉ đề xuất truy vấn SELECT. Việc 3 chỉ sửa spec.
