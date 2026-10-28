# Spec

- Section "THU CỌC THEO GIAI ĐOẠN": tiêu đề chữ hoa nhỏ màu mờ; huy hiệu "Đã thu N%" và nút Sửa cùng hàng.
- Dưới tiêu đề: thanh tiến độ full width và hai số "Đã thu / Còn phải thu" (số to, nhãn nhỏ).
- Giai đoạn là danh sách có đường kẻ mảnh: dấu trạng thái bên trái (✓ / số thứ tự / "!" khi trễ), tên (xuống dòng thoải mái, không cắt "…") và dòng phụ, số tiền và chip bên phải. Giai đoạn trễ có nền đỏ nhạt.
- Không khung, không viền; lề ngang do stack cha quyết định.
- iOS (chuẩn): `InstallmentCardView.make`. Android: `InstallmentCard`, `StageRow`. Web giữ nguyên vì web dùng card cho mọi khối.
- Không đổi API, chuỗi, id kiểm thử.
