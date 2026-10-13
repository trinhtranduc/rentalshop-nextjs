# #924 plan

1. Failing tests first (commit `test(...)`):
   - `tests/api/attendance-export-editors.test.ts`: export "Lịch sử sửa" owner name + empty "Trước";
     person month EDIT row `editorName`.
   - `tests/web-attendance-model.test.ts`: `editSummary`, `isNextDayOf`.
   - `tests/admin-module-pills.test.ts`: Module card pills use `ar-pill-plain`, CSS `text-transform: none`.
   - `tests/scripts-api-local-port.test.ts`: busy port → exit 1, listener untouched; foreign listener after
     start → exit 1 with the ownership message.
2. API: `lib/attendance/editors.ts`, export route, person month route; type `editorName`.
3. Web: model helpers, person page note + table "(hôm sau)", dialog hint; locales ×5. Admin card + CSS.
4. Script: port checks, ownership check, kill only our pid on failure.
5. LOG row, verify (jest ×2 TZ, business e2e ×2 TZ, tsc, lint, build), headed Chrome screenshots, PR.
