# Plan — Mobile orders tab matches its boards

Issue: #401 · Status: accepted · Spec: ./spec.md

## Steps

1. Pure logic + tests (both apps): `OrdersBoardLogic` / `OrdersHomeLogic` additions — band counts, badge count,
   short number, when-text per row kind, pay-line choice, status tag, sale-day title and sum, date-range presets.
   Row model: `TodayWorkRow.totalAmount`; items "×N"; Android `OrderSummary.itemsSummary`, `updatedAt`.
2. View model: filter = status chip + sort + date basis/preset/range; `total` of the current list; mode rent / sale
   (header button) instead of a third segment; keep the generation / job cancel guard, paging, 403 fallback.
3. iOS UI: `OrdersViewController` header (title, Đơn bán, search with scan, segments with badge, chips, sort row),
   `OrderRowCell` flat row, `OrdersSectionHeaderView` band, `OrdersFilterSheet` = Loc sheet (+ "Chọn ngày" pickers).
4. Android UI: `OrdersHomeScreen` header, rows, bands, Loc sheet (`DateRangePicker` for "Chọn ngày"), scan via
   `CameraBarcodeScreen(BarcodeMode.CODE)`.
5. Strings: iOS `vi-VN` / `en` `Localizable.strings`, Android `values` / `values-vi`.
6. Verify: iOS `-only-testing:"POS ADBDTests"`, Android `:app:testDebugUnitTest :app:assembleDebug`; local API on
   3184; screenshots of the five boards on both apps side by side; staff; flag off.

## Risks

- #399 edits the same money calls: keep the formatter calls unchanged in shape.
- The Loc "Ngày giao / Ngày trả" range filters actual hand-over / return dates (the API has no planned-date range).
