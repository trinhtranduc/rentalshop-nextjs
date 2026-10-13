# #927 plan

1. Failing tests first (commit `test(...)`):
   - `tests/api/attendance-members.test.ts`: members GET/PUT (roles, defaults, null on default, 404, owner row
     403 for OUTLET_ADMIN), `/me.required`, punch IN 403 / OUT ok, shift-rules / shifts/day 409, shifts and
     timesheet lists follow the flag (+ people with records).
   - `tests/web-attendance-model.test.ts`: `memberRoleLabelKey`, `canEditMember`.
   - business e2e `tests/e2e/business/attendance-members.e2e.test.js` against a real DB.
2. Schema + migration `20261013090000_attendance_required` (nullable column).
3. DB: `listAttendanceMembers`, `setAttendanceRequired`, selects include `attendanceRequired`.
4. API: `lib/attendance/members.ts`, members route, guards in me / punch / rules / day; lists in shifts / timesheet.
5. Error code in errors.json ×5 (+ `_NAMED`), LOG row. Open PR early.
6. Web: `attendanceApi.members` / `setMember`, types, card on the outlet attendance page, locales ×5.
7. Verify: jest ×2 TZ, business e2e ×2 TZ, tsc api/client, lint, builds, headed Chrome walk.
