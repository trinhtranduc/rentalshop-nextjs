# Plan — allowOverlappingOrders

Issue: #518 · Status: in progress · Spec: ./spec.md

## Steps

1. Schema + hand-written migration (`db-migration`); `prisma validate`.
2. Pure check `apps/api/lib/schedule-conflict.ts` (`timezone-dates`: VN day keys via
   `availability-calendar-days`), DB loader `apps/api/lib/schedule-conflict-check.ts`.
3. `createOrderOnce` gets an optional `beforeInsert` hook so the check runs after the replay lookup.
4. Wire POST/PUT `/api/orders`, PUT `/api/orders/[orderId]`, `/revert`, `/restore`.
5. Settings PUT, profile, login payload; `db.merchants.findById` / `db.users.findById` select the field.
6. Error code + locales (`i18n-keys`).
7. Tests under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`; re-run existing order/profile/login suites.

## Files

- `prisma/schema.prisma`
- `prisma/migrations/20261006120000_merchant_allow_overlapping_orders/migration.sql` — **must be added by a
  human before merge** (the production-gate hook blocks agent writes under `prisma/migrations/` without
  `MIGRATION_EDIT_OK=1`). Exact SQL from `prisma migrate diff` (dev schema → this schema):
  `ALTER TABLE "public"."Merchant" ADD COLUMN "allowOverlappingOrders" BOOLEAN NOT NULL DEFAULT true;`
- `apps/api/lib/schedule-conflict.ts`, `apps/api/lib/schedule-conflict-check.ts`
- `apps/api/app/api/orders/route.ts`, `orders/[orderId]/route.ts`, `.../revert`, `.../restore`
- `apps/api/app/api/settings/merchant/route.ts`, `users/profile/route.ts`, `lib/build-auth-login-response.ts`
- `packages/database/src/{order-create-guard,order,merchant,user}.ts`
- `packages/utils/src/core/errors.ts`, `packages/utils/src/api/response-builder.ts`, `locales/*`
- `tests/api/schedule-conflict.test.ts`, `tests/api/schedule-conflict-routes.test.ts`

## Risks

- Race: two staff creating at the same instant can both pass (the #341 advisory lock is per
  outlet/customer/creator). Acceptable for v1.
- Shops that turn it off with stock never entered (stock 0) get every rental rejected.

## Rollback

Set `allowOverlappingOrders = true` for the shop (instant). Revert the PR; the column can stay.
