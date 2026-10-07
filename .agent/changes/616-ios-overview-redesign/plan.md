# Plan — #616

1. Model (`Model/OverviewV2.swift`): decode `expectedCollected`, `newOrderValue`, `orderValueByType`, `tomorrow`
   as optionals. New `Model/OverviewDashLogic.swift`: chip periods, chart range, forecast sum, tile chips, compact
   money, waterfall, splits, collateral rows, chart bars. XCTest `OverviewDashLogicTests` under three phone zones.
2. View: `Viewcontrollers/Chart/OverviewV2ViewController.swift` rewritten for the board, new
   `Viewcontrollers/Chart/OverviewDashViews.swift` (tiles, chart with callout, Hôm nay card, detail sheet,
   dynamic colours).
3. Strings en + vi.
4. Update the e2e UI test `test7Overview` for the chips.
5. Verify: unit tests, Development build, run on "iPhone 16e" against the local API, screenshots light/dark/sheet.
6. PR into dev, "No API change"; Android parity gap noted.

## #620 follow-up (owner: "top sản phẩm, top khách hàng; Hôm nay chỉ có ở hôm nay")

7. Model: decode `topCustomers` (optional, a bad list is empty). Logic: `topProductRows` / `topCustomerRows` (5 at
   most, bar ratio against the first row, null `totalSpent` → 0) and `showsTodayCard` (range is exactly today).
8. View: Top sản phẩm and Top khách hàng cards below the chart (hidden without revenue access); a row opens the
   product's / customer's orders in the period. The Hôm nay card only for today. Strings en + vi. Tests in
   `OverviewDashLogicTests`. No API change (`topCustomers` is already in `GET /api/analytics/period`).
