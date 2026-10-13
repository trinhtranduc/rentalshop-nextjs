# #923 Plan

1. Failing unit tests, both apps, committed first (bug-fix-tdd):
   - iOS `AttendanceTests`: manual record on a day with a 60′-break shift → `7,9`; scan record keeps its snapshot.
   - Android `AttendanceLogicTest`: same hours rule; a day with two records → two lines.
   - Android resources test: the seven strings equal the iOS copy.
2. iOS: `AttendancePair.hours` (API) and optional break; `weekRows` uses rule 1–3. Test JSON `.sortedKeys`.
3. Android: `AttendanceShift.breakMinutes`, pair hours by rule 1–3, `weekLines` one per record; `WeekRow` renders
   them; strings; settings subtitle capitalised when there is no shift.
4. Verify: iOS Development build + unit tests on a Simulator; Android `:app:assembleDebug :app:testDebugUnitTest`.
5. Visible e2e on a local API (own port, own DB): shift with 60′ break, a manual record in it, a second record the
   same day; screenshot "Ca và công của tôi" on iOS then Android.
6. PR into `dev`, Vietnamese body, `Fixes #923`, "API: không đổi".
