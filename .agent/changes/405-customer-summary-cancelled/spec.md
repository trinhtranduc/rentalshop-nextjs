# Spec — API: customer order summary total excludes cancelled orders

Issue: #405 · Status: approved · Intent: ./intent.md

## Behavior

1. `summary.totalAmount` = sum of `totalAmount` over the customer's non-deleted orders in the
   caller's scope (and optional `startDate`/`endDate`) whose status is not `CANCELLED`.
2. A customer whose only orders are cancelled gets `summary.totalAmount: 0` (number, never null).
3. `summary.totalOrders` is unchanged: equal to `total`, counting cancelled orders.
4. The `orders` list is unchanged: cancelled orders are still listed.
5. Scope is unchanged: OUTLET_ADMIN / OUTLET_STAFF sum their outlet only; MERCHANT its merchant.

## Out of scope

- Web pages that sum the loaded page client-side (`apps/client/app/customers/[id]/orders/page.tsx`
  sums every loaded order, cancelled included). It does not read `summary`; separate follow-up.
- The aggregate's date bounds use `new Date(startDate)` while the list uses
  `normalizeStartDate`; pre-existing, not part of this issue.
- Loyalty `totalSpent` (already counts COMPLETED/RETURNED only) and top-customers `totalSpent`
  (already excludes CANCELLED).

## API and data

Response shape unchanged. Meaning of `summary.totalAmount` changes (intended fix). No migration.

## Acceptance

- [x] Behaviors 1–5 covered by `tests/api/customer-orders-summary-cancelled.test.ts`
- [x] No field added, removed or retyped
