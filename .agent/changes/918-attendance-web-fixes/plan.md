# #918 plan

1. Failing tests first (commit `test(...)`):
   - `tests/api/attendance-records.test.ts`: person month rows carry `dateKey` (edit row on record day,
     rejected scan near VN midnight, cross-midnight OUT); export labels.
   - `tests/api/attendance-schedule.test.ts`: `SHIFT_LOCKED` data (worked today → names; past → all users).
   - `tests/web-attendance-model.test.ts`: `recordTimes` from edit `after`, `editableRecordStarts`,
     `weekCellState` with worked, `defaultOutlet`, `assignStartDefault`.
   - `tests/error-display-named.test.ts`: `_NAMED` lookup.
   - `tests/e2e/business/attendance-rows.e2e.test.js`: real API, manual record of an earlier day → row
     `dateKey`; assign with a worker of today → 409 with `data.users`.
2. API: `lib/attendance/person-month.ts` (rows builder), `schedule-ops.assertDayOpen` async with names,
   `lib/attendance/export-labels.ts`.
3. Web: model helpers, person page Sửa per record, shifts page (tomorrow default, 🔒 today), outlet default,
   `useApiError` `_NAMED`, locales ×5.
4. LOG row, verify (jest ×2 TZ, business e2e ×2 TZ, tsc, lint, build), headed Chrome screenshots, PR.
