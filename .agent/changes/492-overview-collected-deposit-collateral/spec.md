# Spec — #492

## API: `GET /api/analytics/period` (additive)
1. `revenue.collectedBreakdown = { deposits, pickupAndSale, fees, refunds }`. These are built from the same
   collateral-free events as `revenue.collected`, so `deposits + pickupAndSale + fees - refunds = collected`.
   - deposits: `RENT_DEPOSIT` events (a deposit taken on a day before pickup)
   - pickupAndSale: `SALE`, `RENT_PICKUP`, and the rent part of a same-day `RENT_RETURN`
   - fees: damageFee + lateFee of `RENT_RETURN` events
   - refunds: the amount of `RENT_CANCELLED` / `SALE_CANCELLED` events, as a positive number
2. `revenue.collateralReceived`: the securityDeposit of RENT orders picked up in the period, whatever their status now.
3. The same two values are on `operational` (`collectedBreakdown`, `collateralReceived`).

## Mobile (iOS and Android, boards Tong-quan and Tong-quan-giai-thich)
4. Hero "Thực thu" with "Chi tiết ›". Tapping it opens the breakdown sheet.
5. Tiles: Tiền cọc đã thu, Thế chân đã nhận (sub-line: đang giữ, from outlet-operations), Tổng giá trị đơn, Còn phải thu.
6. The (i) info button is removed. The sheet explains the figures.
7. The ĐƠN "collateral held" row is removed.
8. Vietnamese copy says "thế chân" for securityDeposit.
9. Older server (fields absent): the dependent tiles and rows are hidden.
