# Mobile phase 7 — UI gaps without an API change

Issue: #388 · Part of #385 · Author: Trinh Tran · Status: accepted · Created: 2026-10-04

## Problem

The approved boards SP-chi-tiet, Tong-quan and Cai-dat (canvas DY4DRyDH8Kps9gAw9FExLx) show things the redesigned
screens do not have yet: the product's free units for the next 7 days and its orders split by state, overview
figures that open their lists, and counts next to Khách hàng and Người dùng. A few small defects also remain:
English says "1 days late", the iOS app-config call can be answered from `URLCache` for 5 minutes so a flag change
does not apply on the next launch, Android sets the auto deposit only once (from the first item), and #401 left
four unused Android strings.

## Proposed outcome

- Product detail (`newProducts`): a 7-day strip of free units (today outlined), chips "Sắp tới / Đang thuê /
  Đã xong" with counts that filter the product's orders, "Tất cả N" opens every order of the product, and iOS
  order rows have no coloured left bar.
- Overview (`newOverview`): Đơn mới, Đang cho thuê, Trễ hạn and each top product open the matching order list
  for the same period.
- Settings (`newSettings`): Khách hàng and Người dùng show the list totals, only where the row is visible.
- English: "1 day late" / "N days late"; Vietnamese stays "Trễ N ngày".
- iOS app-config ignores the local cache. Android auto deposit = sum of item deposit × quantity, recomputed when
  items change, unless the user typed a deposit (as iOS `Cart`).
- With the flags off, the old screens are unchanged.

## Affected users and systems

`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF` on iOS and Android. No API change; existing endpoints only:
`GET /api/products/{id}/availability-calendar`, `GET /api/orders?productId=&status=`, `GET /api/orders?status=`,
`GET /api/analytics/income/orders`, `GET /api/customers?limit=1`, `GET /api/users?limit=1`.

## Constraints

- Flags off: old screens untouched. Days are device-zone `YYYY-MM-DD` keys.
- No duplicate screens: reuse `OverviewRankingOrdersViewController` (iOS) and `OrdersScreen` routes (Android).
- Do not touch `DefaultAvailabilityRepository.kt` or `ui/auth/AuthScreens.kt` (another agent, #409/#411).

## Open questions

- None.

## Decision log

- 2026-10-04 — Issue #388 opened under the round 2 plan #385 (Trinh Tran)
- 2026-10-04 — The Android `cancel` swap is not present on `origin/dev` (`values` = Cancel, `values-vi` = Hủy);
  nothing to change (agent)
