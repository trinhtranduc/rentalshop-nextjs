# Plan — #850

1. Failing tests, committed first:
   - unit `tests/packages/utils/addon-pricing.test.ts`: quote (monthly, quarterly, trial, ended, VN-day edges),
     renewal monthly total (paused row, marked item, old free item), effective-limit sum with ended items,
     catalog/add zod schemas. Runs under TZ=UTC and TZ=Asia/Ho_Chi_Minh.
   - unit `tests/api/addon-price-routes.test.ts` (route wiring: roles, codes, `PRICED_ADDON_READ_ONLY`), source checks
     for the nav item, the 5 locales and the migration (additive only).
   - e2e `tests/e2e/business/addon-prices.e2e.test.js` (BF-ADD-01..), catalogue in `tests/e2e/TEST_CASES.md`.
2. `prisma/schema.prisma` + `prisma/migrations/20261012090000_addon_prices/migration.sql` (skill `db-migration`):
   new table, new columns, split + backfill SQL; checked on a local DB with rows before/after (sums equal).
3. `packages/utils/src/core/addon-pricing.ts` (from #782 `module-pricing.ts`): `LIMIT_KINDS`, `calculateAddonQuote`,
   `addonRenewalMonthlyTotal`, `isAddonEnded`; zod schemas in `validation-schemas.ts`; `ErrorCode` + 5 locales
   (skill `i18n-keys`); iOS `ErrorCodes.swift` entries.
4. `packages/database/src/addon-price.ts`: catalog CRUD + `shopsUsing`, per-shop list / add (transaction with
   payment) / mark, `renewalItems`, `applyRenewal`; `plan-limit-addon.ts` "not ended" filter.
5. API routes (skill `api-route-standard`): `/api/addon-prices`, `/api/addon-prices/[id]`,
   `/api/merchants/[id]/addons`, `/quote`, `/[addonId]`; renew route; guard on old PUT/DELETE.
6. `packages/utils/src/api/addon-prices.ts` (`addonPricesApi`) + `config/api.ts` URLs.
7. Admin UI: nav item, `/plans/addon-prices`, `/merchants/[id]/addons`, redirect from `/plan-limit-addons`,
   quick-action label, renewal modal add-on total.
8. `.agent/api-changes/LOG.md` row.
9. Verify (skill `verify-change`): lint, `tsc` api/admin/ui/utils/database (no new errors in touched files),
   Jest focused + full vs base in both TZ, `scripts/e2e/business-e2e.sh --build --tz "UTC Asia/Ho_Chi_Minh"` on an
   own DB/port, headed Chrome admin walk at 1280 and 390 px (screens in /private/tmp/claude-billing/shots850/).
10. PR into `dev` (body in Vietnamese, `Fixes #850`, `Refs #782`, `## API compatibility`).
