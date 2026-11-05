# Spec — Revenue block counts manual extensions and add-ons

Issue: #1484 · Status: in-progress · Intent: ./intent.md

## Behavior

1. `REVENUE_PAYMENT_TYPES` is `SUBSCRIPTION_PAYMENT`, `PLAN_EXTENSION`, `PLAN_CHANGE`; `ORDER_PAYMENT` never counts.
2. The received query, the refund query and the "paid before the range" query (new vs renewal) all use that list.
3. A COMPLETED `PLAN_EXTENSION` (method MANUAL) on 03/11 Vietnam time counts in November, in the channel "Chuyển khoản / thủ công".
4. A COMPLETED `PLAN_CHANGE` (card) counts; a PENDING `PLAN_CHANGE` does not, even with a `processedAt`. A COMPLETED one without
   `processedAt` is dated by `createdAt`.
5. A refunded `PLAN_EXTENSION` shows in the refund line of the month of `refundedAt` and stays in its own month's received.
6. "New" is the first received payment of a shop whatever its type.
7. The notes under the channel table and the month table say "gồm gia hạn tay và add-on" (en: "including manual extensions and add-ons").

## Out of scope

Anything else in #1482. Mobile apps.

## API and data

No new field, no migration. Only the `type` filter of the new route changes.

## Acceptance

- [x] Tests: `tests/api/admin-revenue-route.test.ts`, `tests/api/admin-revenue-aggregate.test.ts`
- [x] Jest green in `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`
- [x] Old apps never call the route (compat table in the PR)
