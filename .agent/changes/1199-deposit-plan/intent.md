# Thu cọc theo giai đoạn ("Cách thu cọc")

Issue: #<số> · Author: Trinh Tran · Status: draft (thiết kế đã duyệt 2026-10-25) · Created: 2026-10-25

## Problem
Tiệm áo cưới/áo dài thu tiền nhiều nhịp (cọc giữ chỗ → thu nốt khi nhận áo, có tiệm cọc cố định 200.000đ giữ mẫu, huỷ thường mất cọc). AnyRent chỉ có một khoản `depositAmount` và `Payment` không gắn giai đoạn (docs/TODO.md:121-127). Chủ shop phải ghi sổ/Zalo ai cọc bao nhiêu, hạn thu nốt ngày nào. Không có nhắc thu.

## Proposed outcome
Một cài đặt tiệm "Cách thu cọc" (chỉ MERCHANT đổi, mặc định mọi tiệm = như hôm nay):
- **Thu cọc 1 lần:** cọc = Σ "Cọc mỗi món" × số lượng, phần còn lại thu khi lấy hàng. Không đổi gì.
- **Thu cọc theo giai đoạn:** nhiều giai đoạn, mỗi giai đoạn = % tổng đơn với hạn riêng; giai đoạn cuối luôn là phần còn lại thu khi lấy hàng. Chủ shop sửa số tiền/hạn từng đơn; nhân viên chỉ xem và thu.
Mỗi lần thu là một `Payment` gắn khoá giai đoạn; kế hoạch là một cột JSON trên đơn (không thêm bảng). Thanh tiến độ, thế chân tách riêng, huỷ có ghi phần tiệm giữ/phần hoàn, nhắc nhân viên trên Tổng quan. App cũ vẫn thấy `depositAmount` đúng như trước và không bị hỏng. Kiểm tra được: đơn 12.000.000 mẫu 30% / 40% / còn lại → 3.600.000, 4.800.000, 3.600.000; thu giai đoạn 1 → `depositAmount` = 3.600.000, app cũ "Thu khi giao" = 8.400.000.

## Affected users and systems
MERCHANT (cài chế độ, mẫu, sửa kế hoạch, giữ/hoàn), OUTLET_ADMIN/STAFF/INVENTORY (tạo đơn theo mẫu, thu giai đoạn, xem), api, client, iOS, Android, `Payment`, `Order`, `Merchant.settings`, báo cáo doanh thu, outlet-operations.

## Constraints
Không đổi nghĩa trường cũ (AGENTS.md "API compatibility"). Ngày VN. Doanh thu loại CANCELLED. Không nhắn khách. Giữ đơn giản. Bảo vệ app cũ qua PR0 "hạ tầng" lên `main-real` trước.

## Open questions
Xem "Chưa chốt" ở đầu spec.md.

## Decision log
- 2026-10-25 — Mockup duyệt trước khi mở issue (chủ shop).
- 2026-10-25 — Chủ shop duyệt thiết kế: không bảng mới (JSON `Order.depositPlan` + `Payment.installmentKey`), hai chế độ "Thu cọc 1 lần" / "Thu cọc theo giai đoạn" qua một hàm `effectivePlan`, doanh thu theo ngày thu thật, PR0 bảo vệ app cũ, chặn giao hàng từ app cũ khi còn giai đoạn chưa thu. Thay các bản nháp trước (bảng riêng cho giai đoạn, mẫu theo sản phẩm, loại số tiền FIXED/BY_PRODUCT trong MVP).
