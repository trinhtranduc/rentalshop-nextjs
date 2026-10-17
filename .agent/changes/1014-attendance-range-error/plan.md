# Plan #1014

1. Tests, committed alone: `tests/api/attendance-punch.test.ts`, iOS `POS ADBDTests/AttendanceTests.swift`,
   Android `AttendanceLogicTest.kt`. Confirm that they fail.
2. API: punch route check 5; `response-builder.ts`; `locales/{en,vi,ja,ko,zh}/errors.json`; export label.
3. Web: `locales/*/attendance.json` person.error and the known list in `apps/client/app/attendance/person/page.tsx`.
4. iOS: `Model/Attendance.swift`, `AttendanceService.swift` failure data (outlet name), en/vi Localizable.strings.
5. Android: `AttendanceLogic.kt`, `AttendanceTexts.kt`, `values{,-vi}/strings.xml`.
6. Add a `.agent/api-changes/LOG.md` row; verify (jest, tsc, lint, xcodebuild, gradle); open a PR into dev.
