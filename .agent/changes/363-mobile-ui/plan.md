# Plan — Mobile UI refresh (iOS + Android)

Issue: #363 · Status: accepted · Spec: ./spec.md · Updated: 2026-10-03

## Context

The API the new screens need is on `dev` (#364 status guard, #365 app-config, #368 today work, #369 calendar +
search). The UI follows the agreed design canvas https://claude.ai/artifact/DY4DRyDH8Kps9gAw9FExLx
(boards: Main/VL-tat-ca/VL-ban/VL-tim/Loc, CT-gon/CT-ban/CT-qua-han/Nhan-tra/Giao-do/CT-sua, SP-dong/SP-chi-tiet/
SP-tao/SP-sua/Gio-hang/Gio-hang-ban, Lich, Tong-quan/Tong-quan-chon, Cai-dat, He-thong).
Staff work by day: what to hand over / take back today, tomorrow, and what is late. Merchants use the apps in
production, so every release must work against the live API and every new screen must be switchable off.

Code facts (origin/dev):
- **iOS** `apps/mobile/POS ADBD`: programmatic UIKit + SnapKit, `AppDelegate` swaps roots (no SceneDelegate),
  tabs in `Viewcontrollers/Tabbar/TabbarViewController.swift` (Home, My Order, Calendar, Overview, Setting),
  singletons, light MVVM (`ViewModels/`), Alamofire `Library/Services/BaseService.swift` (sends `X-App-Version`,
  ignores HTTP status; 401 does not log out except export paths), Codable models (`Model/Order.swift` —
  `OrderStatus` throws on unknown values → whole list fails), tokens in `Utils/Define.swift`, strings en/vi-VN
  (1418 keys), **no unit tests**, no feature flags.
- **Android** `apps/mobile-android`: Compose + Material3, `ui/navigation/AnyRentNavHost.kt` (`MainTab` enum),
  state inside composables (ViewModels only for availability/payment), OkHttp `data/ApiClient.kt` + `ApiParity.kt`
  (**no version/platform headers**), org.json parsers, `ui/theme/Theme.kt` (has dark scheme), strings en/vi (540),
  19 JUnit tests, no feature flags.
- Shared audit bugs: stale responses overwrite newer lists, Android duplicate LazyColumn keys (crash), Sale tab
  cannot filter, filters/search not reset on Rent/Sale switch, raw status text in Android badges, Android drops
  status-change errors (`OrdersScreens.kt` ~1029, ~1497), Android note edit drops kept photo URLs (`ApiParity.kt` 213-261),
  iOS inserts an edited order into the wrong list.

## Rules for every phase

- One phase = one issue = one PR per app (or one PR with both), iOS and Android shipped in the same release.
- New screens are new files; old screens stay reachable. A flag from `GET /api/mobile/app-config` `features`
  picks the screen (`newOrders`, `newOrderDetail`, `newProducts`, `newCalendar`, `newOverview`, `newSettings`;
  default off). Turn on per flag via Railway `MOBILE_FEATURES` after the release is in the stores.
- Day-based calls send `timeZone` (device zone); dates show `T7 03/10` in the device zone; no times on lists.
- Status labels only from the central mapping (RENT: Đã đặt/Đang thuê/Đã trả/Đã huỷ; SALE: Hoàn thành/Đã hủy);
  "Trễ N ngày" is a red note from `lateDays`, never a status.
- Money rule from the API (`amountDue`/`refundDue`); the apps do not recompute it.
- New strings in vi + en; error codes in iOS `Model/ErrorCodes.swift` and Android `domain/error/ApiErrorMessages.kt`.
- Touch targets ≥ 44pt/dp, contrast ≥ 4.5:1, Be Vietnam Pro or the current font per platform (He-thong board).

## Issues

| Phase | Issue |
|---|---|
| 0 Foundation | #370 |
| 1 Orders tab | #371 |
| 2 Order detail | #372 |
| 3 Products & cart | #373 |
| 4 Calendar, Overview, Settings | #374 |

## Phase 0 — Foundation (ships first, almost no visible change) · #370

| Task | iOS | Android |
|---|---|---|
| App config + forced update | `AppConfigService` (`Library/Services`), check in `AppDelegate.didFinishLaunching` and `applicationDidBecomeActive`; blocking "Cập nhật ứng dụng" screen with store link; failure → continue | `AppConfigRepository` in `di/AppContainer`; `MainActivity` splash `setKeepOnScreenCondition` until loaded (timeout 2 s); blocking screen in `AnyRentNavHost` |
| Feature flags | `FeatureFlags.shared` (from app-config, cached in UserDefaults) | `FeatureFlags` object (StateFlow, cached in SharedPreferences) |
| Version headers | already sent | add `X-App-Version`, `X-Client-Platform: mobile`, `X-Device-Type: android` in `ApiClient.applyAuth` |
| Time zone | `TimeZone.current.identifier` helper used by new calls | `ZoneId.systemDefault().id` helper |
| Status safety | `OrderStatus.unknown` fallback instead of throwing; central `label`/`color` | `OrderStatusUi.label/color` in `ui/common`; `StatusBadge` uses it (no raw "PICKUPED") |
| Design tokens (He-thong) | colors/status pills/date `T7 03/10`/money formatter (cached `NumberFormatter`) in `Utils/Define.swift` + new `DesignTokens.swift` | `ui/theme` tokens, one status palette, `formatDayShort`, money with "." grouping |
| Tests | add unit test target `POS ADBDTests`: status decode, date key/format in VN + Tokyo, money | JUnit: headers, status labels, date format, app-config parsing |

Done: both apps build; old screens unchanged; with `minVersion` above the app version the blocking screen shows; Android requests carry the headers (API request logs).

## Phase 1 — Orders tab (flag `newOrders`; boards Main, VL-ban, VL-tat-ca, VL-tim, Loc) · #371

| Screen | API |
|---|---|
| Việc cần làm (default) | `GET /api/analytics/outlet-operations?timeZone=` → TRỄ HẠN = `noShows` (Giao · trễ) + `overdueReturns` (Trả · trễ); HÔM NAY = `pickupsToday` + `returnsToday`; NGÀY MAI = `tomorrowPickups` + `tomorrowReturns`; badge = late + today counts |
| Tất cả đơn + sheet Lọc | `GET /api/orders?orderType=RENT&status=&sortBy=&page=` |
| Đơn bán (switch, no tabs) | `GET /api/orders?orderType=SALE`, grouped by sale day client-side (count + sum per day) |
| Tìm (from either list) | `GET /api/orders?q=` (RENT + SALE, product names), sale rows tagged "Bán · …" |

Row: customer, items (`items` / `orderItems`), `#code · dates`, total, `amountDue` ("còn thu") or `refundDue`
("trả cọc"), "Chưa soạn đồ" from `isReadyToDeliver`, red "Trễ N ngày", call button on late rows.

- iOS: new `Viewcontrollers/Orders/` — `OrdersHomeViewController` (switch Thuê/Bán + segmented Việc cần làm | Tất cả),
  `TodayWorkViewController`, `AllOrdersViewController`, `SaleOrdersViewController`, `OrderSearchViewController`,
  `OrdersFilterSheet`; `OrdersStore` (one in-flight request per list, generation id, cancel on change, reset on
  switch, no cross-list insert). `TabbarViewController` picks old/new by flag.
- Android: `ui/orders/v2/` — `OrdersHomeScreen`, `TodayWorkScreen`, `AllOrdersScreen`, `SaleOrdersScreen`,
  `OrderSearchScreen`, `OrdersFilterSheet`; `OrdersViewModel` (StateFlow, `Job` cancel, `distinctBy { id }`, reset on
  switch); `MainTab.Orders` picks old/new by flag.
- Fixes the shared audit bugs in the new code; old screens get only the crash fix (Android `distinctBy`).
- Tests: VM/store unit tests for grouping, stale-response drop, dedupe, reset; parsing of the outlet-operations rows.

## Phase 2 — Order detail (flag `newOrderDetail`; boards CT-gon, CT-qua-han, CT-ban, Giao-do, Nhan-tra, CT-sua) · #372

- Rental detail: status pill, progress Đã đặt → Giao → Trả with dates, items with images, money block, one primary
  action ("Giao đồ · thu X" when RESERVED, "Nhận trả" when PICKUPED), ⋯ menu: Sửa đơn, Hủy đơn (RESERVED and
  PICKUPED, confirm), In hóa đơn.
- Sale detail: Hoàn thành/Đã hủy tag, sale day, items with sale price, "Đã thu"; Hủy đơn (confirm), In hóa đơn.
- Hand-over sheet: checklist of items, collateral, amount `total − deposit + collateral`, QR via existing payment
  flow (`PaymentCollection*`), then `PUT /api/orders/:id {status: PICKUPED}`.
- Return sheet: items back, late/damage fee inputs, net = late + damage − collateral (negative = refund), then
  `PUT {status: RETURNED}`.
- Edit order (CT-sua): cart-like layout with today's editable fields (no new locks); notes with ≤ 5 photos —
  JSON with kept `notesImages` URLs, then multipart new files (`docs/API_ORDER_NOTES_IMAGES.md`).
- `INVALID_ORDER_STATUS` → translated message + reload.
- iOS: new `Viewcontrollers/OrderDetail/` (`OrderDetailViewController`, `HandoverSheet`, `ReturnSheet`,
  `SaleOrderDetailViewController`, `EditOrderViewController`, reuse `NoteViewController` logic); detail no longer
  goes through `PreviewViewController` (which stays for checkout).
- Android: `ui/orders/v2/detail/` (`OrderDetailV2Screen`, sheets, `OrderDetailViewModel`); fix dropped `Result`
  on status changes; `ApiParity.updateOrderDetails` sends kept `notesImages` (also in the old screen — bug fix).
- Tests: VM state per status, actions allowed per status (same table as `canChangeOrderStatus`), notes payload.

## Phase 3 — Products & cart (flag `newProducts`; boards SP-dong, SP-chi-tiet, SP-tao, SP-sua, Gio-hang, Gio-hang-ban) · #373

- Product list with images; new Product detail screen (prices per rental / per day / sale, stock: rented/free from
  `outletStock`, orders of the product via `GET /api/orders?productId=`).
- Add / edit product: photos (cover first), name, category (`GET /api/categories`), barcode with scan (exact match on
  `GET /api/products?q=`), prices, default pricing, deposit, quantity; edit shows rented/free; `OUTLET_STAFF`: no price
  fields, no edit; `STOCK_BELOW_RENTED` message.
- Cart Thuê: dates (days), per item Theo lần / Theo ngày, stepper, availability warning (`availability-calendar`),
  deposit; bottom "Thu ngay · cọc". Cart Bán: no dates/deposit, sale price, stock left; "Bán & thu tiền".
- Delete product waits for API PR 1b (soft delete + active-order check).
- iOS: `Viewcontrollers/Products/v2/`, cart on top of `CartStore`/`Cart.swift` (no model rewrite).
  Android: `ui/home/v2/`, cart on `CartStore.kt`.

## Phase 4 — Calendar, Overview, Settings (flags `newCalendar`, `newOverview`, `newSettings`; boards Lich, Tong-quan, Tong-quan-chon, Cai-dat) · #374

- Calendar: month grid from `GET /api/calendar/orders/count?month&year&timeZone` (`byDate` pickups dot, returns
  ring, `lateReturns` red); day list from `by-date` (pickups) + `by-date&kind=return`.
- Overview: period button → sheet (Hôm nay, Hôm qua, 7 ngày, 30 ngày, Tháng này, Tháng trước, khoảng ngày) →
  `GET /api/analytics/period`; net revenue, bars, change vs previous, order figures, top rented; collateral held from
  outlet-operations `cash.depositsHeld` (revenue permission). Needs API #355 (Vietnam days) first.
- Settings: one grouped list (profile; CỬA HÀNG store info, receipt note, printer; QUẢN LÝ customers, users, export;
  TÀI KHOẢN plan + days left from `subscriptions/status`, language, password; Đăng xuất) linking existing sub-screens.

## Verification (each phase)

```bash
cd apps/mobile && pod install && xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development \
  -destination 'generic/platform=iOS Simulator' build            # BUILD SUCCEEDED
xcodebuild test -workspace "POS ADBD.xcworkspace" -scheme Development -destination 'platform=iOS Simulator,name=iPhone 16'
cd apps/mobile-android && ./gradlew :app:assembleDebug :app:testDebugUnitTest   # BUILD SUCCESSFUL
```
Manual on dev-api with seed data, flag on and off: same-day rental, late return, RESERVED past pickup, SALE then
cancel, order at 23:30 and 00:30 Vietnam, device in another time zone, outlet staff vs merchant. PR includes
screenshots next to the canvas boards. Release: phase 0 → TestFlight / internal track → stores; later phases ship
with flags off, flags turned on per feature on dev-api first, then production.

## Order and dependencies

Phase 0 → Phase 1 → Phase 2; Phase 3 in parallel any time; Phase 4 after API #355.
API PR 1b (product soft delete) before the delete action in Phase 3.
Each phase gets its own plan pass (files, tests) before coding.
