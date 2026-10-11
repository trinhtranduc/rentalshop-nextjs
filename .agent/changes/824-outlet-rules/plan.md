# Plan — #824

1. Failing tests (commit alone): `tests/api/outlet-rules-routes.test.ts`, `tests/api/outlet-create-stock.test.ts`,
   `tests/api/outlet-deactivated-auth.test.ts`, `tests/api/outlet-plan-limit.test.ts`,
   `tests/outlet-stock-backfill-migration.test.ts`, `tests/web-outlets-owner-buttons.test.ts`.
2. `apps/api/lib/outlet-rules.ts`: owner check, open-order count, status-change guard. Use in the 3 outlet routes.
3. `packages/database/src/outlet.ts` create in a transaction with stock rows; `user.ts` findByEmail selects `outlet.isActive`.
4. `packages/auth/src/core.ts`: `isOutletRole` in `validateMerchantAccess`; disabled-outlet check in `authenticateRequest`.
   `apps/api/lib/build-auth-login-response.ts`: login refusal.
5. `plan-limits.ts`: outlets default 1.
6. Migration folder (data only).
7. Error codes + 5 locales. Web outlets page + model.
8. Tests green (TZ=UTC and Asia/Ho_Chi_Minh), tsc on touched files, LOG.md row, PR to dev.
