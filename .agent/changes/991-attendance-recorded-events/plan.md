# Plan — Recorded attendance events only

Issue: #991 · Status: implemented · Spec: ./spec.md

## Steps and files
1. Apply timezone-dates and existing React guidance. No new strings or API changes.
2. apps/client/app/attendance/attendance-model.ts: filter failed REJECTED rows from visible history before applying all/suspected selection; remove rejected from RowFilter.
3. apps/client/app/attendance/person/page.tsx: remove rejected option; keep raw rows for edits and API summary KPIs.
4. tests/web-attendance-model.test.ts: mixed events, empty/error-only input, suspect events and immutable original rows.
5. tests/e2e/web/attendance-person.web.js: real headed client/API checks for no rejected rows, preserved edit/auto-close rows, newest-first, filters, raw audit preservation and correct editing. Require isolated local URLs and explicit fixture IDs/month.
6. Run targeted UTC/Vietnam tests, focused lint, client type-check, locale JSON check; rerun real E2E. Existing whole-repo gate failures are recorded in the preceding plans.
7. Update PR #990 scope, issue links and verification after review.

## Risks
Manual/edited rows and auto-close events remain visible, and raw data/totals remain intact. Only failed scan attempts are hidden. Editing successful events must still resolve the latest edit.

## Rollback
Revert display filtering and restore the rejected filter; audit data is never removed.

## Verification — 2026-10-15
- UTC targeted attendance/locale suites: 4 passed, 191 tests passed.
- Asia/Ho_Chi_Minh targeted attendance suites: 3 passed, 52 tests passed.
- Focused Next lint across model, person and locations pages: no warnings or errors.
- Client type-check remains blocked by unrelated existing package/UI type errors; no diagnostic in changed attendance source files.
- Real headed Chrome E2E: 6 cases / 14 checks passed, 0 failed. Real local API dataset includes QR_WRONG_OUTLET and ATTENDANCE_NOT_CONFIGURED failures; these remain in the raw audit but are absent from the list. Edit history and total hours are preserved. Screenshot inspected for list and badge layout. See e2e.md.
- node --check of the new E2E script and git diff --check passed.
- Previous full-repo lint/type/test blockers documented in #988 remain unresolved; no full-repo green claim.
