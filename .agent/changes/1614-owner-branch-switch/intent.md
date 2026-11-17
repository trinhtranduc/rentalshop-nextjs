# Owner switches branch on the app: Việc cần làm and products follow the branch

Issue: #1614 · Author: Claude (for the owner) · Status: accepted · Created: 2026-11-17

## Problem

A shop owner with two or more branches picks a branch on Home (#828).

- "Việc cần làm" (and every other block fed by `GET /api/analytics/outlet-operations`) keeps showing the account's own
  branch. Every owner who signed up has `User.outletId` = the first branch (`register/route.ts:269`), and the route takes
  `userScope.outletId` before it looks at the role, so the app's `outletIds` is ignored. "Tất cả chi nhánh" on the web
  also shows only that branch.
- `GET /api/analytics/income/orders` (orders behind an Overview tile) has the same pattern: another branch → 403.
- Products not listed at the chosen branch still show on Home for the owner (#1346 design). The owner wants them hidden.

## Proposed outcome

- For MERCHANT, both routes use `outletIds` when sent, else every branch of the shop. Outlet roles unchanged.
- iOS and Android send `listed=true` for the owner of a shop with two or more branches; the list reloads on a switch (already).

## Affected users and systems

MERCHANT with two or more branches; api, client (web dashboard numbers become right), iOS, Android.

## Constraints

Additive for installed apps: no response shape change; old apps already send `outletIds`. No migration, no env.

## Open questions

- None.

## Decision log

- 2026-11-17 — Owner: "chưa hiện ở chi nhánh này ở mobile cần ẩn luôn, sản phẩm ở outlet nào thì load lại outlet đó" (owner)
