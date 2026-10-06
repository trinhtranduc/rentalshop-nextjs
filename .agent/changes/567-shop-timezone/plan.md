# Plan — Shop time zone (phased, one issue/PR each)

Skills: `timezone-dates`, `db-migration`, `api-compat-review`, `api-route-standard`, `mobile-parity`,
`i18n-keys`, `bug-fix-tdd` (for the server-local-midnight and UTC-export bugs).

## Phase 1 — Foundation (API, no behaviour change)
1. Migration `merchant_timezone` (additive, default). Prisma type, `packages/database/src/merchant.ts` select.
2. `packages/utils/src/core/timezone.ts`: `isValidTimeZone`, `DEFAULT_SHOP_TIMEZONE`; helpers in
   `date.ts`, `date-range.ts`, `rental-days.ts`, `revenue-calculator.ts` take an optional zone (default unchanged).
3. `apps/api/lib/shop-timezone.ts`: `shopTimeZone(userScope, request)`.
4. Login/profile/merchant payloads + `PUT /api/settings/merchant` (zod `timezone`), change history, error code;
   register accepts optional `timezone` (lenient: invalid → default).
5. Tests: helpers × zones (UTC, VN, NY with DST, Tokyo, Sydney), payloads additive, PUT validation.
6. Compat table in the PR (old apps: field ignored; Vietnam answers unchanged).

## Phase 2 — API day logic on the shop zone
7. Replace constant/offset/UTC-day/server-midnight paths listed in spec §6 with `shopTimeZone(...)`;
   fix the three server-local-midnight routes and UTC-day exports with failing tests first.
8. Old-app inputs: `resolveAvailabilityQueryWindow`, ignore client `timeZone` for shop users (decision log).
9. Cron per shop zone. 10. Tests: every route × {VN, NY, Tokyo} + VN regression; `business-e2e` both TZ.

## Phase 3 — Web (client + admin)
11. `useShopTimeZone()`; replace `SHOP_TIMEZONE` in signed-in screens; range picker/calendars/"today".
12. Register (client) sends `Intl.DateTimeFormat().resolvedOptions().timeZone`; Cài đặt "Múi giờ" picker (short list + search), warning text (Q1). Admin merchant detail shows/edits it.
13. Browser e2e with a stubbed non-VN shop (light/dark, 1440/390).

## Phase 4 — Mobile (iOS reference, then Android)
14. Register sends `TimeZone.current.identifier` / `ZoneId.systemDefault().id`; read `merchant.timezone`; dynamic shop zone; availability/calendar/analytics send shop zone;
    Android order-create instants from shop days. 15. Unit tests with a non-VN zone; `mobile-e2e-local`.

## Phase 5 — Docs and guards
16. `timezone-dates` skill: "shop civil day" replaces "Vietnam civil day"; AGENTS.md Time line; new eval case
    `shop-timezone-day.md`; release-review note.

## Verify (every phase)
`yarn lint`, `yarn type-check`, `cd tests && TZ=UTC yarn test && TZ=Asia/Ho_Chi_Minh yarn test`,
`scripts/e2e/business-e2e.sh` (phase 2+), mobile builds (phase 4).
