# Intent: sửa giấy tờ và thế chân sau khi đã lấy hàng (#1279)

## Muốn gì, vì sao
Người dùng lỡ bấm "Giao đồ" khi chưa nhập giấy tờ / thế chân, rồi không sửa được trên app. Chủ chọn phương án C:
sau khi đã lấy hàng (PICKUPED) vẫn sửa được hai thông tin này, không đổi trạng thái đơn.

## Ràng buộc
- Không đổi API (khách dùng app cũ không cập nhật được). Dùng `PUT /api/orders/{id}`.
- Chỉ sửa giấy tờ và thế chân. Không mở sửa sản phẩm / giá.
- Làm đúng mockup tab 2 phần C (G20…G39). Đơn giản, không thêm ý.
- Ngoài phạm vi: A (nút Giao đồ mờ tới khi nhập, tick "Không giữ gì"), B (hoàn tác PICKUPED -> RESERVED).
