# Plan — #361

Issue: #361 · Status: accepted · Spec: ./spec.md

1. Failing tests, committed alone.
2. `packages/constants/src/status.ts`: `ORDER_STATUS_TRANSITIONS`, `canChangeOrderStatus(orderType, from, to)`.
3. `apps/api/app/api/orders/[orderId]/status/route.ts`: scope check after `findById`, then transition check.
4. `apps/api/app/api/orders/[orderId]/route.ts` (PUT): transition check when `status` is sent; merchant check for every non-ADMIN user.
5. `packages/utils/src/analytics/period-report.ts` `computeTopProducts`: `status: { not: CANCELLED }`.
6. `apps/api/lib/order-deposits.ts` `resolveOrderDeposits`, used by `POST /api/orders`.
7. `INVALID_ORDER_STATUS` in `ERROR_MESSAGES` and `locales/{ja,ko,zh}/errors.json`; eval case.
8. Verify: new tests, full `tests/` under both TZ (no new failing suite vs `origin/dev`), api `next build`.
