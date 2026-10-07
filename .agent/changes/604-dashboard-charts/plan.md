# Plan — Tổng quan redesign

Issue: #604 · Status: approved · Spec: ./spec.md

## Steps

1. `overview-model.ts`: pure helpers — `DETAIL_KINDS`/`parseDetail`, `buildTiles` (values, chips), `sparkPoints`,
   `waterfallRows`, `outstandingSplit`, `collateralRows`, `initials`, `topBars`. No `@rentalshop/*` imports.
2. `tests/web-overview-tiles.test.ts`: those helpers, run under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
3. `overview/sections.tsx`: replace KpiCards/MoneyCards with `KpiTiles`; restyle chart, Hôm nay, today orders, top.
4. `overview/DetailDrawer.tsx`: drawer shell (focus trap, Esc, backdrop) + four bodies.
5. `page.tsx`: wire `?detail=`, staff rules unchanged.
6. `locales/{en,vi}/dashboard.json`: new keys (other locales have no dashboard.json).
7. `tests/e2e/web/date-roundtrip.web.js`: dashboard selectors for the new markup, same assertions.
8. Verify: tsc, eslint, Jest both TZ, web-e2e in three zones, screenshots light/dark 1440/390, staff.

Skills: `timezone-dates` (no new day logic beyond keys), `i18n-keys`. Not needed: `api-route-standard`,
`db-migration`, `mobile-parity`, `api-compat-review` (no API or package change).

## Files

- `apps/client/app/dashboard/page.tsx`, `overview-model.ts`, `overview/sections.tsx`, `overview/DetailDrawer.tsx`
- `locales/en/dashboard.json`, `locales/vi/dashboard.json`
- `tests/web-overview-tiles.test.ts`, `tests/e2e/web/date-roundtrip.web.js`

## Risks

- e2e dashboard regexes depend on text; updated in the same PR.
- Web only; installed mobile apps unaffected.

## Rollback

Revert the PR; no data or API change.
