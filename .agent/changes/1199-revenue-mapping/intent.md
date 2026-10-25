# Gom ánh xạ doanh thu về một chỗ (tiền đề của #1199)

Issue: #1199 · Author: Trinh Tran · Status: draft · Created: 2026-10-25

## Problem

Cùng một việc "đổi dòng `Order` thành đầu vào của `revenue-calculator.ts`" được chép tay ở 13 nơi, và mệnh đề
`OR` chọn đơn có sự kiện doanh thu trong kỳ được viết tay ở 7 nơi (`createdAt` / `pickedUpAt` / `returnedAt` /
huỷ / bán xong / kế hoạch). PR "thu cọc theo giai đoạn" (#1199) phải thêm sự kiện lấy từ `Payment`; sót một nơi thì
hai màn hình báo hai con số khác nhau mà không có lỗi nào.

## Proposed outcome

Một hàm `toRevenueOrderData(order)` và một hàm `buildEventWhere(range, kiểu)` cạnh calculator; mọi nơi dùng chúng.
Không đổi số, không đổi truy vấn, không đổi thứ tự, không đổi tên trường. PR sau thêm sự kiện `Payment` ở đúng một chỗ.

## Affected users and systems

`api` (các route `analytics/*`), `packages/utils` (`income-period-summary`, `period-report`). Không đổi iOS, Android, web.

## Constraints

Chỉ chuyển code. Không DB, không migration. Số trước và sau phải bằng nhau từng byte dưới `TZ=UTC` và `TZ=Asia/Ho_Chi_Minh`.
