# Spec — #492

## API: `GET /api/analytics/period` (additive)
1. `revenue.collectedBreakdown = { deposits, pickupAndSale, fees, refunds }`. These are built from the same
   collateral-free events as `revenue.collected`, so `deposits + pickupAndSale + fees - refunds = collected`.
   - deposits: `RENT_DEPOSIT` events (a deposit taken on a day before pickup)
   - pickupAndSale: `SALE`, `RENT_PICKUP`, and the rent part of a same-day `RENT_RETURN`
   - fees: damageFee + lateFee of `RENT_RETURN` events
   - refunds: the amount of `RENT_CANCELLED` / `SALE_CANCELLED` events, as a positive number
2. The same value is on `operational.collectedBreakdown`.
3. `growth.orderValue = { current, previous, growth }`: `revenue.totalOrderValue` against the previous period of the same length. Left out when either side cannot be read.
4. "Thế chân đang giữ" keeps coming from `GET /api/analytics/outlet-operations` (`cash.depositsHeld.securityDeposit`).

## Mobile (iOS and Android, boards Tong-quan and Tong-quan-giai-thich)
5. The big number is **Tổng giá trị đơn mới** (`revenue.totalOrderValue`) with "▲ x% so với kỳ trước · không tính đơn huỷ" (`growth.orderValue.growth`; the line is hidden when absent).
6. Two tiles, same style: **Thực thu** (`revenue.collected`, sub-line "Tiền đã vào tiệm", tap opens the detail sheet) and **Còn phải thu** (orange, sub-line "Của các đơn mới"). No chevrons.
7. Detail sheet: Cọc khi tạo đơn, Thu khi giao đồ, bán hàng, Phí hư hỏng, trễ hạn, Hoàn tiền đơn huỷ (only when > 0), total Thực thu; a box "Thế chân đang giữ" (outlet-operations), "Không tính vào thực thu vì sẽ trả lại khách."
8. The ĐƠN "collateral held" row is removed. Vietnamese copy says "thế chân" for securityDeposit.
9. Older server (fields absent): dependent rows hidden.
