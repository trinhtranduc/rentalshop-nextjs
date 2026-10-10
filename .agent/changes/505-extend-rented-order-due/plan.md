# Plan — #505

1. `prisma/schema.prisma` + migration `20261010120000_add_order_pickup_total_amount` (SQL in `migration.sql.pending` here until a human adds it: the production gate blocks agent writes to `prisma/migrations`).
2. `packages/database/src/order.ts` (+ `order-optimized.ts`, `outlet-operations.ts`): write `pickupTotalAmount` on hand-over; select and map it for list rows.
3. `apps/api/lib/order-balance.ts`: extension in the PICKUPED balance.
4. `packages/utils/src/core/revenue-calculator.ts`: `pickupTotalOf` / `extensionAmountOf`; pickup, return, cancel, future return.
5. Analytics routes and `packages/utils/src/analytics/*`: select and pass `pickupTotalAmount`.
6. Tests: `tests/e2e/business/order-edit.e2e.test.js` BF-EDIT-11 plain, BF-EDIT-14, BF-EDIT-15; `tests/api/order-balance.test.ts`; `tests/revenue-calculator.test.js`.
7. Follow-up (not in this PR): iOS and Android return/detail screens read `pickupTotalAmount` (or the server `refundDue`/`amountDue`) so the return screen matches the list.
