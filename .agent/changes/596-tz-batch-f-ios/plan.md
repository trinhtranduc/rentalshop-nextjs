# Plan — #596 timezone batch F (iOS)

1. Failing tests first: `POS ADBDTests/ShopTimeZoneTests.swift` (new, in the test target) — committed alone.
2. `FIX_MODE=1`. Helpers in `Utils/RCExtentions.swift` (`shopTimeZone`, `shopCalendar`, `startOfShopDay`,
   `endOfShopDay`, `shopDayFromDevicePick`, `devicePickFromShopDay`) and `DayFormatter` defaults.
3. Cart: `CartV2Logic.rentalBounds`, `CartV2ViewController.setDates/pickDates`, `Cart.calculateRentalDays`.
4. Extension sheet + `RentalExtension` defaults. Orders filter pickers + `OrdersHomeLogic` defaults.
5. `TabsV2APIService` / `AnalyticsAPIService` `timeZone` parameters; Calendar/Overview today keys and picker
   bridging; product strip; draft reminder/card; `loadOverviewOrder` default today.
6. Build + test on simulator "TZ Batch F" with derived data in the worktree; PR with parity notes for Android.
