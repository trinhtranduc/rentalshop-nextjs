# Cọc lớn hơn tiền thuê: hoàn cọc dư khi trả, thu đủ thế chân khi giao

Issue: #1490 · Author: Trinh Tran · Status: accepted · Created: 2026-11-07

## Problem

Đơn thuê (RENT) có cọc (`depositAmount`) lớn hơn tiền thuê (`totalAmount`) bị tính sai tiền ở hai bước:

- **Giao đồ** (`RESERVED`): `max(0, tổng − cọc + thế chân − đã thu)` ép cả tổng về 0, nên cọc dư bị trừ vào thế chân.
  Thuê 100.000, cọc 300.000, thế chân 500.000: app báo thu 300.000, đúng ra 500.000.
- **Trả đồ** (`PICKUPED`): công thức chỉ có `phụ phí + gia hạn − thế chân − đã thanh toán lúc trả`, không dùng cọc.
  Thuê 100.000, cọc 300.000, không thế chân: app hoàn 0 (đúng ra 200.000). Shop giữ dư 200.000 mà không ai biết.

Cùng một công thức nằm ở `apps/api/lib/order-balance.ts` (dòng 39, 43-45), iOS `OrderDetailLogic.swift`, Android `OrderDetailLogic.kt` và web `apps/client/app/orders/orders-model.ts` (`handOverMoney`, `returnMoney`).
Chủ tiệm gặp khi khách cọc 50% hoặc 100% giá trị váy (nhiều hơn tiền thuê).

## Proposed outcome

Cọc được giữ từ lúc đặt đến lúc trả; khách chỉ mất tiền thuê và phụ phí.

- Giao đồ: `thu = max(0, tiền thuê − cọc) + thế chân − đã thu lúc giao`, không âm.
- Trả đồ: `ròng = phụ phí + gia hạn − thế chân − đã thanh toán lúc trả − cọc dư`, `cọc dư = max(0, cọc − tiền thuê lúc giao)`.
  Ròng âm là tiền hoàn khách, dương là thu thêm.
- Cọc nhỏ hơn hoặc bằng tiền thuê: số y như hiện tại.

Hai case chủ tiệm đã xác nhận (2026-11-07), số ở spec.

## Affected users and systems

- Roles: mọi role thao tác đơn (`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`); cùng một số cho mọi role.
- API: `computeOrderBalance` → `GET /api/orders` (`amountDue`/`refundDue`), `GET /api/analytics/outlet-operations`, `GET /api/orders/[orderId]/qr-code` (số tiền QR lúc giao).
- iOS (`apps/mobile`) và Android (`apps/mobile-android`): màn giao đồ, màn trả đồ, chi tiết đơn.
- Web (`apps/client`): trang chi tiết đơn tính lại bằng `orders-model.ts` (Thu khi giao, Nhận trả, khung Thanh toán), nên cũng sửa.

## Constraints

- Chỉ cộng thêm vào công thức; không đổi tên hay kiểu field nào. App cũ trên `main-real` tự tính trong app, không sửa được từ xa (`api-compat-review`).
- API, iOS, Android cho cùng một con số (`mobile-parity`).
- Bắt đầu bằng test lỗi (`bug-fix-tdd`). Không thêm chuỗi người dùng mới, không migration.
- Cách làm đơn giản (chủ tiệm: "đơn giản và chuẩn").

## Open questions

- Đơn có gia hạn (`pickupTotalAmount`) và cọc dư: API dùng `cọc − pickupTotalAmount` (cọc dư trừ vào phần gia hạn). App hiện không đọc `pickupTotalAmount` và không tính gia hạn ở màn trả. Giữ nguyên chỗ này, ghi vào spec 6.
- Doanh thu theo ngày và `getOrderRevenueEvents`: hoàn cọc dư lúc trả có đi qua báo cáo "đã thu / hoàn" đúng ngày không. Kiểm tra sau khi sửa, không nằm trong issue này.
- Gộp "cọc" và "thế chân" thành một khoản: để sau, cần impact review riêng.

## Decision log

- 2026-11-07 — Làm bước sửa công thức trước, chưa gộp cọc và thế chân (đề xuất của agent, chủ tiệm không phản đối).
- 2026-11-07 — Phụ phí làm giảm số hoàn; thế chân luôn hoàn cho khách khi trả; bảng 2 case ở spec đúng ý (Trinh Tran).
