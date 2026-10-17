# Spec — Sort a product's order list by rental date

Issue: #1025 · Status: in-progress · Intent: ./intent.md

## Behaviour

1. Orders-by-product screen (iOS `OverviewRankingOrdersViewController` with `.product`, Android `EntityOrdersScreen`
   with `isProduct`) shows a sort row under the "ĐƠN HÀNG" band: "Xếp theo ngày lấy · gần nhất trước ▾" (same text,
   font and colour as Tất cả đơn).
2. Tapping it opens the "Lọc & sắp xếp" sheet of Tất cả đơn with only "Xếp theo" and "Thứ tự" (no date range).
   "Xem N đơn" applies; "Đặt lại" goes back to the default.
3. Default `sortBy=pickupPlanAt&sortOrder=desc`. Choices: pickup → `pickupPlanAt`, return → `returnPlanAt`,
   created → `createdAt`; nearest first → `desc`, farthest first → `asc` (same meaning as Tất cả đơn).
4. Rows: the pickup or return chip of the sorted date is bold; sorted by created date, "tạo …" is bold. Other row
   parts (pay line, late chip) stay as today.
5. Customer / snapshot / rented-out / late-return lists unchanged.

## Acceptance

- Unit tests: default sort (pickup, nearest first → `pickupPlanAt`/`desc`); params for every choice; the bold chip in
  the product list row.
- iOS build + unit tests, Android `assembleDebug` + `testDebugUnitTest` green.
