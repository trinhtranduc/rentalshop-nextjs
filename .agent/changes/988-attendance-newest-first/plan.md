# Plan — Newest attendance events first

Issue: #988 · Status: implemented · Spec: ./spec.md

## Steps
1. Apply timezone-dates and preserve existing work-day resolution.
2. Reverse the timestamp and day comparators in groupRowsByDay, apps/client/app/attendance/attendance-model.ts.
3. Update existing ordering assertions in tests/web-attendance-model.test.ts; include input immutability and descending overnight timestamps in those existing cases.
4. Verify model tests in TZ=UTC and TZ=Asia/Ho_Chi_Minh; run yarn lint, yarn type-check, and the full tests suite. Read the VN civil-day eval.
5. Exercise descending order and filter selection in a visible browser fixture using the real model. Record limitations if the full app cannot run.

## Files
- apps/client/app/attendance/attendance-model.ts — descending display order.
- tests/web-attendance-model.test.ts — expected order under the new behavior.
- .agent/changes/988-attendance-newest-first/*.md — intent and verification.

## Risks
Presentation only. Work-day groups still take precedence over a later edit timestamp. No API, migrations, or mobile impact.

## Rollback
Revert the two comparator changes and corresponding ordering expectations.

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
