# Plan #949

1. Failing tests (commit alone): `tests/attendance-rules.test.ts` (17-digit coords), `tests/api/attendance-punch.test.ts`
   (allowed outlets, data, scan outletId / qrOutletId), `tests/api/attendance-records.test.ts` or punch file (person
   month `qrOutlet`), business e2e `tests/e2e/business/attendance-fraud-checks.e2e.test.js`, iOS `AttendanceTests.swift`,
   Android `AttendanceLogicTest.kt`.
2. API: `rules.ts` rounding; `lib/attendance/outlets.ts`; punch route; schema + migration `qrOutletId`;
   `createScan` input; person month row.
3. iOS / Android: parse `data.qrOutlet` / `data.allowedOutlets`, new string in en + vi, fallback.
4. LOG row, compat table, verify (TZ=UTC and TZ=Asia/Ho_Chi_Minh, e2e, apps, headed web check).
