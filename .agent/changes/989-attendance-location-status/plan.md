# Plan — Attendance location setup status

Issue: #989 · Status: implemented · Spec: ./spec.md

## Steps and files
1. Apply ui-ux-pro-max, vercel-react-best-practices and i18n-keys; reuse existing Pill and text keys.
2. apps/client/app/attendance/attendance-model.ts: add tri-state locationConfigured to locationRow using null checks.
3. apps/client/app/attendance/locations/page.tsx: add location column with warning / configured badges or unknown dash.
4. locales/{vi,en,ja,ko,zh}/attendance.json: translate locations.locationSet.
5. tests/web-attendance-locations.test.ts: update existing unknown assertion and cover partial/zero coordinate states.
6. Verify targeted tests, locale key parity, full tests, lint and type-check. Use a visible browser fixture with actual model and component rendering for UI states.

## Risks
Unknown API results must remain distinct from absent coordinates. No API/data/migration impact.

## Rollback
Revert the location column, model property, new locale key and related assertions.

## Verification — 2026-10-15
- TZ=UTC targeted attendance model, edit-summary, locations and locale JSON suites: 4 passed, 188 tests passed.
- TZ=Asia/Ho_Chi_Minh targeted attendance model, edit-summary and locations suites: 3 passed, 49 tests passed.
- All five attendance locale key sets match.
- next lint apps/client --file app/attendance/attendance-model.ts --file app/attendance/locations/page.tsx: no warnings or errors.
- Visible Cốc Cốc local fixture: actual Locations page rendered with stubbed API data and existing Pill markup. Missing position is amber even with QR generated; configured position is green; unknown data is a dash. Existing outlet links retain the correct href. Actual attendance model displays 15/10 17:00, 08:00, 07:55 before 14/10; rejected filter and switching back to all both checked.
- Full yarn lint blocked by Turbo TLS/keychain initialization. Full yarn type-check and app type-check fail on unrelated existing files; neither log reports either changed source file.
- Full Jest run fails in unrelated revenue/availability suites and terminates in railway-deployment.test.js calling process.exit(1); no full-suite green claim.
- git diff --check passed. VN civil-day eval reviewed; no day-key conversion changes.
- No production deployment or deployed-account E2E performed. Local browser fixture is not a full authenticated app E2E.

## Full local UI E2E follow-up — 2026-10-15
10/10 manual UI checks passed against the actual Next.js client, real API and isolated local PostgreSQL database. Includes login, missing/configured badges, saving position, descending day/time order, filters, empty state and editing the correct record. See ../988-attendance-newest-first/e2e.md. Earlier static-fixture limitations are superseded for these checked flows; no production or installed mobile app was exercised.
