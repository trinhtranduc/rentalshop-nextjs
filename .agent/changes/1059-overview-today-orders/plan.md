# Plan — Overview "Hôm nay": orders created today

Issue: #1059 · Status: in-progress · Spec: ./spec.md

## Steps

1. iOS logic (`OverviewDashLogic`): `showsTopCards`, `showsTodayOrders`, `todayOrdersSummary`, `todayOrderRows`,
   `todayOrderSubtitle`; unit tests in `OverviewDashLogicTests` (behaviors 1, 4, 5).
2. iOS request `TabsV2APIService.overviewNewOrders` (timeZone + outletIds) and the card in
   `OverviewV2ViewController.render()` (behaviors 2, 3, 6, 7, 8).
3. Android logic (`OverviewDashLogic.kt`, `OverviewTodayOrders`) + `OverviewDashLogicTest`; ViewModel loads the rows;
   `TodayOrdersCard` in `OverviewV2Screen`; nav wires `onOpenOrder`.
4. Strings: iOS en + vi-VN Localizable, Android `values` + `values-vi`.
5. iOS UI test for the card next to `test7Overview*`; run the existing overview UI tests against a local seeded API.
6. Screenshots: Hôm nay with the card, 7 ngày with the Top cards.

Skills: `mobile-parity`, `timezone-dates`, `i18n-keys`, `mobile-e2e-local`. No API change, so no
`.agent/api-changes/LOG.md` row.

## Risks

- income/orders pages by id: a day with more than 200 orders needs more pages (loaded, capped at 10 pages).
- The "Xem tất cả" list (existing) does not pass `outletIds`; for a merchant with a branch chosen it may list more
  orders than the card. Pre-existing for the tile too; noted for a follow-up.

## Rollback

Revert the PR. No data or API changes.
