# Plan
1. Failing tests: unit (quote, renewal with modules, removal rule) + e2e `tests/e2e/business/modules.e2e.test.js` (BF-MOD).
2. Prisma schema + migration (additive, data copy) — skill `db-migration`.
3. `packages/database/src/billing-module.ts`; `planLimitAddons.calculateTotal` → new table.
4. Utils: `calculateModuleQuote` in `subscription-billing-calculations.ts` (same day rule).
5. API routes (spec 10–12) — skill `api-route-standard`, error codes in 5 locales — skill `i18n-keys`.
6. Renew route uses modules (spec 6).
7. Admin UI (spec 13–14).
8. LOG row; verify: Jest both TZ, e2e both TZ (`scripts/e2e/business-e2e.sh`), admin in a browser; PR to dev (after #781).
