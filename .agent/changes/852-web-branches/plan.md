# Plan — #852

Issue: #852 · Status: in progress · Spec: ./spec.md

## Steps
1. Tests first: `tests/web-orders-branches.test.ts` (URL/selection helpers, row branch label,
   settings branch selection, calendar branch param), `tests/api/orders-outlet-ids.test.ts`
   (GET /api/orders and export `outletIds`).
2. API: `apps/api/app/api/orders/route.ts`, `apps/api/app/api/orders/export/route.ts` reuse
   `narrowAnalyticsOutletFilter` + `resolveAnalyticsOutletFilter`. `packages/utils` `ordersApi`: `outletIds`.
3. Orders page: picker + row label + counts + export (`apps/client/app/orders/*`).
4. Settings: `settings-model.ts` (tab roles, `settingsOutlet` param), `SettingsPanel.tsx`, `sections.tsx`.
5. Calendar: branch select.
6. i18n keys in 5 locales (`i18n-keys`). LOG.md row (`api-compat-review`).
7. Verify: jest (TZ=UTC and Asia/Ho_Chi_Minh), tsc client/api, lint, headed Chrome 390/1280.

## Risks
- Orders route change is additive; outlet roles ignore the param.

## Rollback
Revert the PR; old clients never send `outletIds`.
