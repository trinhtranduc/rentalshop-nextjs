# Plan — Attendance module (1/4)

Issue: #907 · Status: draft (code waits for mockup approval) · Spec: ./spec.md

## Steps

1. Failing tests first (commit before code):
   - unit `tests/attendance-rules.test.ts`: haversine, suspected-fake rules, QR sign / verify / expiry,
     close time (VN day end, cross-midnight + 4 h), hours minus break, late / early, shift matching —
     at 16:59:59Z / 17:00:00Z, month end; run under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`.
   - route tests `tests/api/attendance-*.test.ts` (mocked db, existing pattern in `tests/api`): punch order of checks and IN/OUT, kiosk QR
     (token, module, not configured), module gate 403, roles (staff other user 403, OUTLET_ADMIN radius
     403, other merchant 404), records edit needs a reason, admin modules PUT ADMIN only, profile and
     login carry `merchant.modules`.
2. Schema + migration (`db-migration`): 6 new models, `prisma/migrations/<ts>_attendance_module/`, additive.
3. `packages/constants`: `MODULES` catalog; `packages/database/src/merchant-module.ts`,
   `attendance-setting.ts`, `shift-template.ts`, `shift-assignment.ts`, `attendance-record.ts` (+ edits).
4. `apps/api/lib/attendance/` (import-light): `geo.ts`, `qr-code.ts`, `rules.ts` (close time, hours,
   late/early, shift match, fake flags), `module-gate.ts` (`requireModule`), `scope.ts` (outlet / user scope).
5. Routes (`api-route-standard`): `apps/api/app/api/attendance/{settings,settings/kiosk-link,kiosk/qr,
   punch,me,shift-templates,shift-templates/[id],shifts,shifts/[id],records,records/[id],timesheet,
   timesheet/export}/route.ts`; `apps/api/app/api/merchants/[id]/modules/{route.ts,[key]/route.ts}`.
6. `merchant.modules` in `apps/api/lib/build-auth-login-response.ts` and `apps/api/app/api/users/profile/route.ts`.
7. Error codes (`i18n-keys`): `packages/utils/src/core/errors.ts` / response-builder status map;
   `locales/{en,vi,ja,ko,zh}/errors.json`.
8. Admin: `merchantModulesApi` in `packages/utils/src/api`, a "Module" card on
   `apps/admin/app/merchants/[id]/page.tsx` (toggle + optional end date).
9. API compat (`api-compat-review`): row in `.agent/api-changes/LOG.md`; PR `## API compatibility` table
   against `release-*` tag on `main-real` (login / profile gain `merchant.modules`; Android parses JSON
   by key, iOS Codable ignores unknown keys — verify with file:line).
10. Business e2e `tests/e2e/business/attendance.e2e.test.js`: module off → 403; admin turns on; configure
    outlet; kiosk QR; punch in / out in range; out of range; mock; timesheet hours. Run with the existing
    suites: `scripts/e2e/business-e2e.sh --build --tz "UTC Asia/Ho_Chi_Minh"` on an own DB and port.
11. Headed Chrome check: admin turns the module on for a merchant.

## Verify

`npx tsc --noEmit -p apps/api/tsconfig.json`, same for `apps/admin`; `yarn lint`;
`cd tests && TZ=UTC yarn test attendance && TZ=Asia/Ho_Chi_Minh yarn test attendance`; full jest both TZ;
business e2e both TZ.

## Files

- `prisma/schema.prisma`, `prisma/migrations/*_attendance_module` — new tables
- `packages/constants`, `packages/database/src/*` — catalog, data access
- `apps/api/lib/attendance/*`, `apps/api/app/api/attendance/**`, `apps/api/app/api/merchants/[id]/modules/**`
- `apps/api/lib/build-auth-login-response.ts`, `apps/api/app/api/users/profile/route.ts` — `merchant.modules`
- `packages/utils` (errors, api client), `locales/*/errors.json`, `apps/admin/app/merchants/[id]/page.tsx`
- `tests/attendance-rules.test.ts`, `tests/api/attendance-*`, `tests/e2e/business/attendance.e2e.test.js`, `.agent/api-changes/LOG.md`

## Risks

- Login / profile change touches every client: additive key only; tested on both login paths.
- The kiosk route is public: token is 256-bit random, only returns QR + first names of recent punches.
- Concurrency double punch: user row lock in one transaction.
- Migration: new tables only; no backfill.

## Rollback

Revert the PR. The tables stay unused (additive); `merchant.modules` disappears and no client depends on it yet.
