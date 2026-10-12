# Plan — Attendance web screens (#908)

Issue: #908 · Status: in review (PR #913) · Spec: ./spec.md · Needs #907 (API) for the e2e walk.

## Steps

1. Tests first: `tests/web-attendance-model.test.ts` (pure model), extend `tests/web-shell-nav.test.ts`.
2. `packages/types/src/attendance.ts` (+ export) — wire types of #907 spec rules 7–31.
3. `packages/utils/src/api/attendance.ts` (+ export) — `attendanceApi` via `authenticatedFetch`;
   kiosk via `publicFetch` with `X-Kiosk-Token` and no login redirect; export → Blob.
4. `apps/client/app/attendance/attendance-model.ts` — pure logic (`timezone-dates`).
5. Nav: `components/shell/nav.ts` (`module` flag, OUTLET_ADMIN outlets with module), `ShopSidebar.tsx`,
   `useMerchantModules` (stored user + profile refresh).
6. Screens: `app/attendance/{page,person/page,shifts/page,templates/page}.tsx` + shared parts and dialogs;
   `app/outlets/page.tsx` column; `app/outlets/[id]/attendance/page.tsx`; `app/kiosk/qr/[token]/page.tsx`;
   `lib/routes.ts` public `/kiosk`. Map: `leaflet` (new client dependency) + OSM tiles.
7. Locales (`i18n-keys`): `locales/*/attendance.json` (new namespace, loaded in `apps/client/i18n.ts` and
   `apps/client/app/layout.tsx`), `common.json` `shell.nav.attendance`.
8. Verify (`verify-change`), PR into `dev` (`review-pr`), then the headed Chrome walk on the #907 branch API.

## Verify

`npx tsc --noEmit -p apps/client/tsconfig.json`; `yarn lint`; `SKIP_ENV_VALIDATION=true yarn workspace
@rentalshop/client build`; `cd tests && TZ=UTC yarn test web-attendance web-shell-nav` and the same with
`TZ=Asia/Ho_Chi_Minh`; locale parity script from `i18n-keys`.

## Risks

- API shapes are coded from the #907 spec before its routes exist: the client normalizes list/map shapes
  and the e2e walk confirms them; mismatches are fixed here, never by changing the API contract.
- Leaflet touches `window`: loaded with a dynamic import inside an effect.

## Rollback

Revert the PR. The menu only appears for merchants with the module on.
