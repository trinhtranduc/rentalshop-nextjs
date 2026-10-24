# Plan — #1187

1. Flip tests: outlet add-on on a 1-outlet plan → 201; `PUT /modules/loyalty` → 200; GET modules catalog includes loyalty; e2e BF-BRANCH-14 / BF-ADD-08; `outletAddonsBlockPlan` always false.
2. Drop the `isMultiBranchPlan` purchase gates (merchant-addons, plan-limit-addons routes). `outletAddonsBlockPlan` → false.
3. `LEGACY_SWITCH_MODULE_KEYS` = `attendance`, `loyalty`.
4. Admin add-ons page: sell outlet rows always; Bật/Tắt Khách thân thiết via `merchantModulesApi`.
5. Add-on prices copy. LOG.md row. Verify `yarn test` of the touched files.
