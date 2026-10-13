# Plan — Four ready-made shift templates per branch

Issue: #959 · Status: approved · Spec: ./spec.md

## Steps

1. Failing tests first: `tests/api/attendance-schedule.test.ts` (route), `tests/packages/shift-template-seed.test.ts`
   (DB function, mocked prisma), `tests/e2e/business/attendance-default-templates.e2e.test.js`. Commit.
2. `prisma/schema.prisma` + migration `20261018090000_attendance_templates_seeded` (`ALTER TABLE ADD COLUMN` nullable).
3. `packages/database/src/shift-schedule.ts`: `DEFAULT_SHIFT_TEMPLATES`, `seedDefaultShiftTemplates`; wire as
   `db.attendance.seedDefaultTemplates`.
4. `apps/api/app/api/attendance/shift-templates/route.ts` GET calls it.
5. `.agent/api-changes/LOG.md` row. Verify: type-check, lint, unit tests both TZ, business e2e both TZ, headed web check.

Skills: `api-route-standard`, `db-migration`, `api-compat-review`. No i18n (names are data), no mobile (no attendance in
installed apps; new apps read the same list).

## Files

- `prisma/schema.prisma`, `prisma/migrations/20261018090000_attendance_templates_seeded/migration.sql`
- `packages/database/src/shift-schedule.ts`, `packages/database/src/attendance.ts`
- `apps/api/app/api/attendance/shift-templates/route.ts`
- tests above, `tests/helpers/attendance-route-mocks.ts`

## Risks

- Existing branches with attendance on and no templates get the four on next load (intended).
- Migration is additive and nullable: no lock-heavy rewrite.

## Rollback

Revert the PR. The column can stay (nullable, unread by old code); seeded templates stay as normal shop data.
