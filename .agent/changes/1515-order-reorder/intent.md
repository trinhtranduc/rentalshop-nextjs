# "Đặt lại" ở chi tiết đơn: tạo giỏ mới giống đơn cũ

Issue: #1515 · Author: Trinh Tran (with Claude) · Status: accepted · Created: 2026-11-09

## Problem

Khách quen thuê hoặc mua lại đúng những món cũ. Nhân viên phải tạo đơn mới và chọn lại khách, từng món, số lượng, ghi chú. Ở chi tiết đơn chỉ có
"Sửa" (sửa chính đơn đó), không có cách tạo đơn mới từ đơn cũ.

## Proposed outcome

Chi tiết đơn (web, iOS, Android) có hành động **"Đặt lại"**. Bấm vào: mở một giỏ mới giống đơn này; nhân viên chỉnh rồi tạo đơn như thường lệ.
Không tạo gì trên server cho đến khi bấm Tạo đơn.

## Affected users and systems

Người có quyền tạo đơn: `MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` (và kho nếu shop cho `orders.create`). `apps/client` (web), `apps/mobile` (iOS),
`apps/mobile-android`, `packages/ui` (menu chi tiết đơn nếu dùng chung). Không API, không migration.

## Constraints

- Không đổi API: dữ liệu đơn từ API chi tiết đơn có sẵn; giá từ API sản phẩm có sẵn; tạo đơn vẫn `POST /api/orders`.
- iOS là chuẩn, Android và web theo (`mobile-parity`). i18n đủ `locales/{en,vi,ja,ko,zh}` và chuỗi iOS / Android.
- Cách mở giỏ giống "Xác nhận đơn online" (#1124 mobile, #1293 web): giỏ đang dùng có món thì mở giỏ mới, trống thì dùng luôn, đủ 10 giỏ thì báo.

## Open questions

- Chi nhánh của giỏ mới: mặc định như một giỏ mới (chi nhánh đang chọn). Web chủ shop có thể mang chi nhánh của đơn cũ. Chốt khi làm web.
- Vị trí "Đặt lại" trong sheet ⋯: chờ chủ shop chọn A (ba nhóm) hoặc B (hàng nút), tab "★ Sheet ⋯ chi tiết đơn: sắp xếp lại" của trang mockup chung.
- Dòng món có biến thể (#variants): kiểm tra hình dạng item khi làm; nếu item chỉ có `productId` của biến thể thì lấy đúng sản phẩm đó.

## Decision log

- 2026-11-09 — Làm cả ba nền tảng (web, iOS, Android). (chủ shop)
- 2026-11-09 — Ngày lấy / ngày trả để trống cả hai; đơn thuê thì hỏi chọn ngày như một đơn thuê mới. (chủ shop)
- 2026-11-09 — Giá lấy theo giá hiện tại của sản phẩm. Lấy: loại đơn, khách, món, số lượng, ghi chú. Không lấy: giảm giá, cọc, thế chấp, khoản đã thu, thanh toán, ảnh, trạng thái, mã đơn. (chủ shop)
- 2026-11-09 — Vị trí trên điện thoại: phương án D của tab mockup "Sheet ⋯ chi tiết đơn". Màn chi tiết đơn có hàng 3 nút dưới khối trạng thái: **Đặt lại** (icon nhân bản), **Chia sẻ**, **Ghi chú · N**. Sheet ⋯ chỉ còn việc sửa đơn: Sửa đơn, Gia hạn, Lịch sử, rồi dòng đỏ (Huỷ / Xoá). Web giữ dòng đầu menu ⋯. (chủ shop)
