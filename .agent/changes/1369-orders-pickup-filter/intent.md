# Bộ lọc "Ngày giao" trên danh sách đơn web

Issue: #1369 · Author: Trinh Tran (agent) · Status: in-progress · Created: 2026-10-30

## Problem

Danh sách đơn web (`/orders`) chỉ lọc theo "Ngày tạo". Chủ shop muốn xem đơn khách sẽ lấy đồ hôm nay / ngày mai / tuần tới (`pickupPlanAt`).

## Proposed outcome

Có ô lọc "Ngày giao:" cạnh "Ngày tạo:"; chọn khoảng ngày thì bảng, số đếm trên chip, phân trang, xuất Excel đều theo `dateField=pickupPlanAt` + `startDate`/`endDate` (ngày Việt Nam). Đơn không có ngày giao (đơn bán) không khớp.

## Affected users and systems

Mọi vai trò xem được `/orders` ở web (`apps/client`). Dùng tham số API có sẵn; không đụng iOS/Android.

## Constraints

- Không đổi API/DB. Chỉ thêm trường tuỳ chọn `dateField` ở `OrderFilters` và `searchOrders` (additive).
- Ngày theo `Asia/Ho_Chi_Minh`; test ở `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`.
- Không thêm "Ngày trả"; không thêm bộ lọc ngày thứ ba.

## Open questions

- Dịch ja/ko/zh cần người xem lại.

## Decision log

- 2026-10-30 — "Ngày tạo" và "Ngày giao" loại trừ nhau vì API chỉ nhận một `dateField`; chọn cái này thì cái kia về "Mọi ngày" (chủ shop, qua yêu cầu)
- 2026-10-30 — Nếu URL tay có cả `created` và `pickup`, `pickup` thắng.
