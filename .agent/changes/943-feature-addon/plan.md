# Plan — #943

1. Failing tests, committed first: `tests/packages/utils/feature-addon.test.ts` (money rules, schemas, active-module
   merge), `tests/api/feature-addon-routes.test.ts` (routes), `tests/packages/database/feature-addon-db.test.ts`
   (add + legacy switch-off, active keys), admin source test, e2e `tests/e2e/business/feature-addon.e2e.test.js` (BF-FEAT).
2. Schema + migration; constants `mergeModuleSources`; utils (kinds, schemas, `addonColumnsFor` guard, API types, `CASH`).
3. database: `add` feature path, `getActiveMerchantModuleKeys` union; error code + 5 locales.
4. API: addon-prices POST/PUT, merchant addons POST/quote/PATCH/GET.
5. Admin: price list, merchant Add-on page (dialogs), remove Module card.
6. LOG row; verify both TZ; business e2e; headed admin check; PR into dev.
