# Spec

Chủ chốt: không dùng card; chia section phẳng cùng kiểu "ITEMS · 2".

- Section "THU CỌC THEO GIAI ĐOẠN" (tiêu đề chữ hoa nhỏ màu mờ, huy hiệu "Đã thu N%" và nút Sửa cùng hàng), thanh tiến độ full width, hai số "Đã thu / Còn phải thu".
- Danh sách giai đoạn có đường kẻ mảnh: dấu trạng thái bên trái (✓ / số / "!" khi trễ), tên + dòng phụ, số tiền và chip bên phải. Giai đoạn trễ có nền đỏ nhạt.
- Không khung, không viền; lề ngang do stack cha quyết định.
- iOS `InstallmentCardView.make`; Android `InstallmentCard` / `StageRow`. Web giữ nguyên (web dùng card cho mọi khối).
- Không đổi API, chuỗi, id kiểm thử.
