# Spec — #967

**Loyalty on** = the plan's `features` include `loyalty` (today's rule, unchanged) **or** an un-ended `loyalty`
feature add-on (`isActive`, `endsAt` null or future), or a legacy module row (#907 rule, none exist for loyalty).

## Rules

1. `packages/constants` `MODULES` gains `{ key: 'loyalty', requires: [] }` (`MODULE_KEY.LOYALTY`).
   `planModuleKeys(planFeatures)` = module keys a plan includes (`['loyalty']` when `hasLoyaltyFeature`).
   `mergeModuleSources(rows, addons, now, planKeys)` adds the plan keys as always-on rows.
   `describeModuleSources(...)` → per catalog key `{ key, active, plan, addon, legacy }` (admin label).
2. **One check**: `getActiveMerchantModuleKeys(merchantId)` (database) reads legacy rows, un-ended feature add-ons
   and the plan (`subscription.plan` or legacy `merchant.Plan`, same as before) → active keys.
   `merchantHasLoyaltyFeature` / `assertLoyaltyFeature` (loyalty package) = `'loyalty'` in those keys. Every loyalty
   gate already calls these (orders POST/PUT/status, all `/api/loyalty/*` via `withLoyaltyPlanGate`), so they all follow.
   Error when off: unchanged `403 PLAN_UPGRADE_REQUIRED`.
3. `merchant.modules` (login / profile) gains `'loyalty'` when on (plan or add-on). Additive.
4. **Price list**: a row `limitKind: 'feature'`, `featureKey: 'loyalty'` (validation is catalog-driven, no route change).
5. **Buy / turn off / undo / mid-period charge / renewal / change-plan credit**: the #943 code, unchanged.
   Example: 79.000 / tháng, 18 VN days left → `round(79.000 ÷ 30 × 18)` = **47.400**; trial → 0; renewal adds 79.000.
6. **Already in the plan**: buying the `loyalty` add-on for a shop whose plan includes loyalty → 422
   `ADDON_FEATURE_IN_PLAN` (quote and purchase; 5 locales). No double charge.
7. Turned off (`removeAtPeriodEnd`) → on until the period end, then off; loyalty rows (program, tiers, points) kept.
8. `GET /api/merchants/[id]/addons` adds `featureSources` (`[{ key, active, plan, addon, legacy }]`).
   Admin Add-on page: a line "Khách thân thiết: theo gói / theo add-on / theo gói + add-on"; a feature in the plan is not offered.
9. Shop web: the Khách thân thiết menu item needs `merchant.modules` to include `loyalty` (MERCHANT only, as before).
10. iOS `User.hasLoyaltyFeature` also reads `merchant.modules` (installed apps keep the plan-only rule). Android has no
    loyalty gate (shows what the API returns).

## Out of scope
Shop self-purchase, auto-ending an add-on when a plan change adds loyalty (admin turns it off; the label shows both).

## API compatibility (against `release-2026-10-12.2` / `main-real`)
See PR table and `.agent/api-changes/LOG.md`.
