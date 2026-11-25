# Spec #1646

Status: in-progress

1. `Merchant.showPublicStock` là boolean, mặc định `false`.
2. `PUT /api/settings/merchant` nhận `showPublicStock` (boolean, tùy chọn): MERCHANT hoặc ADMIN, role khác 403 `INSUFFICIENT_PERMISSIONS`, không phải boolean 400 `INVALID_INPUT`. Body chỉ có trường này thì chỉ cập nhật nó (không cần tên). Response có `showPublicStock`.
3. `GET /api/users/profile` trả `merchant.showPublicStock` (false khi thiếu).
4. `GET /api/public/{tenantKey}/products` trả `merchant.showPublicStock`: true chỉ khi shop bật công tắc **và** đang nhận đặt online. Đọc cột lỗi (chưa migrate) → false, phần còn lại của trang không đổi.
5. `GET /api/public/{tenantKey}/availability`: công tắc bật → mỗi ngày thêm `available` (số nguyên ≥ 0; ngày đã qua = 0); `status` giữ nguyên. Công tắc tắt → không có `available`. Đọc cột lỗi → như tắt.
6. Lịch đặt thuê (web): công tắc tắt → như hiện nay, không gọi availability. Bật → gọi availability cho tháng đang xem và chi nhánh đang chọn; mỗi ngày dưới số ngày: số còn, ngày còn 1 tô vàng, ngày hết ghi "Hết" và gạch số ngày; chú giải "Số cái còn / Còn 1 / Hết". Gọi lỗi → không hiện số, lịch vẫn dùng được.
7. Ngày hết vẫn bấm chọn được. Khoảng chọn có ngày hết → dòng báo vàng liệt kê ngày hết; có ngày còn ít hơn số lượng đang chọn → dòng báo ngày đó chỉ còn bao nhiêu. Nút "Thêm vào yêu cầu" không bị khóa vì hai dòng này.
8. Đổi chi nhánh → số đổi theo chi nhánh. Đổi tháng → tải tháng đó.
9. Cài đặt → Trang shop công khai: dòng mới dưới "Hiện giá trên trang shop"; mờ và không bật được khi "Nhận đặt online" tắt (kèm câu giải thích); chỉ chủ shop sửa (role khác thấy mờ + "Chỉ chủ shop bật / tắt được.").
10. Chữ mới có đủ 12 ngôn ngữ (Cài đặt và trang shop).
11. Ngày tính theo giờ Việt Nam; số còn = tồn kho chi nhánh trừ đơn RENT `RESERVED` / `PICKUPED` giữ hàng trong ngày (`loadProductDays`).

Ngoài phạm vi: iOS / Android, lưới sản phẩm, tìm bằng ảnh, kiểm tra hàng khi gửi yêu cầu, đổi `status` free / full.
