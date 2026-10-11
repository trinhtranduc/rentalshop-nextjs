# Spec — #852

## Orders list (`/orders`)
- MERCHANT with ≥ 2 outlets (active or not) sees the Chi nhánh picker from Tổng quan
  (`BranchPicker`, `branch-model.ts`): multi-select, "Tất cả" = active outlets, "Đã tắt" group.
- Selection lives in `?outlets=1,3` (left out for "Tất cả"); no browser memory on this page.
- All tabs follow it: GET /api/orders (`outletIds=`), status chip counts, and
  GET /api/analytics/outlet-operations (`outletIds=`, exists since #827) for Việc cần làm / Chưa lấy đồ and their badges.
- Each row shows its branch name (compact) while the picker is shown.
- Excel export without a ticked selection sends the same `outletIds`.
- Outlet roles: no picker, no change.

## API (additive)
- `GET /api/orders` and `GET /api/orders/export`: optional `outletIds=1,3`. MERCHANT only:
  every id must be one of its outlets (403 `CROSS_MERCHANT_ACCESS_DENIED`), malformed → 400 `INVALID_QUERY`.
  `outletId` (single) wins when both are sent. Other roles ignore it. Absent = unchanged.

## Cài đặt (dialog)
- `bank-accounts` tab: MERCHANT too. `receipt` tab: unchanged roles.
- MERCHANT with ≥ 2 outlets: a branch select at the top of both tabs; default = the default outlet;
  kept in the URL as `?settingsOutlet=<id>` (dropped when the dialog closes).
- Bank accounts: the shared panel for that outlet. Receipt: note, bank QR and preview of that outlet only.
- OUTLET_ADMIN: its own outlet, as today. Staff / inventory: unchanged.

## Calendar
- MERCHANT with ≥ 2 outlets: a single branch select (Tất cả / one branch), `?outlet=<id>`, passed to
  the calendar count/by-date routes (they already scope a merchant's `outletId`) and the late list.

## Out of scope
Shop-wide settings (currency, overlapping orders, loyalty, tax id, customers). Mobile.
