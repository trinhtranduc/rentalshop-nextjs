# Plan — Admin manual extension with a paid amount fails after saving

Issue: #1462 · Status: approved · Spec: ./spec.md

## Steps

1. Failing test `tests/api/admin-extend-paid-payment.test.ts` (`bug-fix-tdd`): paid extension → 200 + Payment with
   `merchantId` 7; amount 0 → no Payment; payment write fails → no write saved; running store plan + paid → A13 kept
   and Payment written. The mock `$transaction` commits staged writes only when the callback resolves.
   Add the same `$transaction` mock to `tests/api/manual-extension-store-credit.test.ts` so it keeps covering the
   route once the writes move into a transaction (no assertion changes). Commit red.
2. Fix `apps/api/app/api/admin/subscriptions/[id]/extend/route.ts`: wrap `subscription.update`, `payment.create`
   and `subscriptionActivity.create` in `db.prisma.$transaction(async (tx) => …)`, pass
   `merchantId: subscription.merchantId`. Response unchanged.
3. Domain skills: `api-route-standard` (structure kept), `api-compat-review` (issue + PR table, LOG row),
   `timezone-dates` (no date logic change). No migration, no i18n, no mobile change.
4. Verify: the new file and the related suites under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`, the whole `tests` suite,
   `npx tsc --noEmit -p apps/api/tsconfig.json` filtered to the changed file, `yarn lint`.

## Files

- `apps/api/app/api/admin/subscriptions/[id]/extend/route.ts` — the fix
- `tests/api/admin-extend-paid-payment.test.ts` — new regression test
- `tests/api/manual-extension-store-credit.test.ts` — `$transaction` in the mock only
- `.agent/api-changes/LOG.md` — row for #1462

## Risks

- Interactive transaction holds a connection for three writes; same pattern as `merchants/route.ts`, `auth/register`.
- Installed apps: none call the route.

## Rollback

Revert the PR. The route goes back to failing on paid extensions; no data migration to undo.
