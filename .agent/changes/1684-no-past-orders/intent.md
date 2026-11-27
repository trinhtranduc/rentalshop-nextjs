# Intent #1684: không tạo đơn thuê ở ngày quá khứ

Chủ shop: chặn tạo đơn ở ngày quá khứ, chỉ tính từ ngày hiện tại tới tương lai, cả web và mobile.

Vì sao: nhân viên chọn nhầm ngày (lịch mở ở ngày cũ, gõ sai tháng) nên đơn chiếm lịch sai và báo cáo theo ngày lệch.

Ràng buộc:
- Khách đã cài app iOS/Android không thể ép cập nhật. Hành vi của app cũ không đổi (`api-compat-review`).
- Ngày theo ngày Việt Nam (`Asia/Ho_Chi_Minh`), không theo UTC (`timezone-dates`).
- Chỉ **tạo đơn thuê mới**. Sửa đơn đã có và đơn bán không đổi.
- iOS là chuẩn; Android đổi theo iOS.

Chủ shop đã chốt (26–27/11/2026): app mới chặn, app cũ vẫn tạo được; chỉ chặn tạo mới; hôm nay luôn hợp lệ.
