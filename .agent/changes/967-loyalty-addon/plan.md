# Plan — #967

1. Failing tests first: `tests/packages/utils/loyalty-addon.test.ts` (constants: plan keys, merge, sources; money
   examples), `tests/packages/database/loyalty-addon-db.test.ts` (gate: plan only / add-on only / both / neither /
   add-on ended), `tests/api/loyalty-addon-routes.test.ts` (price row, buy, 422 in plan, GET featureSources),
   client nav test, e2e `tests/e2e/business/loyalty-addon.e2e.test.js` (BF-LOY-ADD).
2. constants (MODULES, planModuleKeys, merge, describe); database (plan source, `sources`); loyalty plan-gate.
3. API: `ADDON_FEATURE_IN_PLAN` in checkAddonPurchase; GET `featureSources`; legacy `/modules/[key]` stays attendance only.
4. Admin labels + Add-on page; client nav `module: 'loyalty'`; iOS `hasLoyaltyFeature`.
5. LOG row; verify both TZ; business e2e; headed admin + client check; PR into dev.
