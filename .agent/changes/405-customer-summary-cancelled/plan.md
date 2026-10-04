# Plan — API: customer order summary total excludes cancelled orders

Issue: #405 · Status: approved · Spec: ./spec.md

## Root cause

`apps/api/app/api/customers/[id]/orders/route.ts` builds `aggregateWhere` for
`prisma.order.aggregate({ _sum: { totalAmount } })` with only `deletedAt`, `customerId`, scope and
date. There is no status filter, so cancelled orders are summed.

## Steps

1. Test first: `tests/api/customer-orders-summary-cancelled.test.ts` runs the real route with
   `db` / `prisma` mocked over fixture orders (the mock aggregate honours `where`, including a
   `status: { not }` / `{ notIn }` filter). Cases: mixed statuses, only-cancelled, outlet scope,
   `totalOrders` still counts cancelled. Commit `test(api): …` alone; it must fail on the sum.
2. Fix: the money aggregate adds `status: { not: ORDER_STATUS.CANCELLED }`. The list query and the
   count are untouched. Commit `fix(api): …`.
3. Verify: the new test, the whole `tests/` suite against the baseline, and
   `npx tsc --noEmit -p apps/api/tsconfig.json` against `origin/dev`.

## Files

- `apps/api/app/api/customers/[id]/orders/route.ts`
- `tests/api/customer-orders-summary-cancelled.test.ts` (new)

## Callers checked

| Client | Reads `summary`? | What it shows |
|---|---|---|
| iOS `OverviewRankingOrdersViewController` (orders by customer, opened from top customers / customer search) | yes, `summary.totalOrders` and `summary.totalAmount` | header "N đơn · amount"; falls back to summing loaded pages when `totalAmount` is nil |
| iOS #387 customer detail ("Tổng chi") | yes (per issue; not on `dev` yet) | spend total |
| Android `ApiClient.searchCustomerOrders` → `parseOrdersPage` | no, reads `orders` / `total` only | list only |
| Web client `apps/client/app/customers/[id]/orders/page.tsx` | no | sums loaded page client-side, includes cancelled (out of scope, see spec) |
| Web admin `apps/admin/app/customers/[id]/orders/page.tsx` | no | sums loaded page, already excludes cancelled |
| `packages/ui` `CustomerProfile.customerOrderStats` | no (uses customer.orders) | spend already excludes cancelled; count includes them |

## API compatibility (installed apps)

| Route / area | Change | Old iOS | Old Android | Web | Risk |
|---|---|---|---|---|---|
| GET /api/customers/{id}/orders | `summary.totalAmount` now excludes CANCELLED orders; same name, still a number (0 when nothing to sum) | `OrdersSummary.totalAmount: Double?` decodes it unchanged (`apps/mobile/POS ADBD/Model/Order.swift:133-136`, `OrdersData.summary` optional at :148); shown in header at `Viewcontrollers/Chart/OverviewRankingOrdersViewController.swift:535-553` — the number gets smaller for customers with cancelled orders (intended) | does not read `summary` (`data/ApiClient.kt:221-241` → `parseOrdersPage` :300-307 reads `orders`/`total`) | `ordersApi.getOrdersByCustomer` (`packages/utils/src/api/orders.ts:287-301`) callers do not read `summary` | none (data meaning: intended fix; iOS users see a lower "orders by customer" total, now matching the top-customers ranking which already excludes CANCELLED) |
| GET /api/customers/{id}/orders | `summary.totalOrders` unchanged (counts cancelled) | `OverviewRankingOrdersViewController.swift:534` | n/a | n/a | none |
