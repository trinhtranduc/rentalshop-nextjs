# Spec

- Thứ tự (đơn thuê): khối trạng thái (+ Sẵn sàng giao) / KHÁCH HÀNG / MÓN · N / THANH TOÁN / THU CỌC THEO GIAI ĐOẠN (khi có kế hoạch) / GIẤY TỜ & THẾ CHÂN / GHI CHÚ. Đơn bán: trạng thái / KHÁCH HÀNG / MÓN / THANH TOÁN / GHI CHÚ.
- Dòng món B: ảnh 36px, tên, dòng "SL × giá" (theo lần `1 × 96.000đ`; theo ngày `1 × 50.000đ × 5 ngày`; khối `1 × Khối 3 ngày + 2 ngày thêm`), thành tiền bên phải, công thức khối `120.000 (3 ngày) + 2 × 20.000` (bỏ "= tổng"), hộp ghi chú vàng giữ (#891).
- Cuối MÓN chỉ "Tạm tính" (tổng các dòng). THANH TOÁN có Giảm giá (khi > 0) và Tổng tiền thuê, rồi các dòng tiền cũ theo trạng thái (phí trễ, hư hỏng, thu khi giao...).
- Bỏ dòng "Đã lấy" riêng; bỏ dòng "Tiền thế chân" khi section Giấy tờ & thế chân đã hiện; dòng "Khi nhận trả: trả khách/thu" chuyển xuống cuối section đó.
- Số N của MÓN = số dòng món (iOS); Android đếm số dòng.
- Không đổi API, không đổi cách tính tiền, giữ hiển thị "giữ giá" / "Thu một phần".
