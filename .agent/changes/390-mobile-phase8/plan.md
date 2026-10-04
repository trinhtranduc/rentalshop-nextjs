# Plan — Mobile phase 8

Issue: #390 · Status: accepted · Spec: ./spec.md

## Steps

1. Pure logic + tests (TDD):
   - iOS: `OrdersHomeLogic.listPayLine`, `RentOrdersFilter` (`nearestTask`, planned basis), `CalendarV2Logic.note`,
     `ProductAccess.canDelete`, new `Model/RentalExtension.swift`; tests `POS ADBDTests/Phase8Tests.swift`.
   - Android: `OrdersBoardLogic.listPayLine`, `OrdersSort.NEAREST_TASK`, `DateBasis` planned, `CalendarLogic.note`,
     `ProductAccess.canDelete`, new `domain/orders/RentalExtension.kt`; tests `Phase8LogicTest.kt`.
2. Models: iOS `Order` (+ `balanceAmountDue` / `balanceRefundDue` from `amountDue` / `refundDue`),
   `CalendarDayOrder` (+3); Android `OrderSummary` (+3 optional), `CalendarDayOrder` (+3).
3. iOS UI: `OrderRowCell` pay line, `OrdersFilterSheet` caption, `CalendarDayRowCell` note,
   `ProductDetailViewController` Xóa, `OrderDetailViewController` Gia hạn + new `OrderExtendSheetViewController`.
4. Android UI: `OrdersHomeScreen` row + sheet, `CalendarV2Screen` row, `ProductDetailScreen` Xóa,
   `OrderDetailV2Screen` Gia hạn + new `OrderExtendSheet.kt`.
5. Strings: iOS `vi-VN` / `en`; Android `values` / `values-vi`.
6. Verify: unit tests + builds; local API (port 3195, DB `anyrent_mobile_e2e`); screenshots merchant + staff.

## Risks

- `Order` is shared with old screens: the new properties are optional and only read by v2 rows.
- An API older than #416 rejects `sortBy=nearestTask` and the planned `dateField` values with 400 (zod enum): the
  list shows its error state. Both are opt-in in the sheet (default sort and basis unchanged) and the flags are
  server-side, so they are only on where the API has #416.

## Rollback

Revert the PR, or switch the flags off server-side.
