# #916 Plan

1. Failing tests, committed first (`test(mobile): …`):
   - iOS `POS ADBDTests/AttendanceTests.swift`: decode a month JSON with a manual record (EDIT only) and an edited
     scan record; expect the week rows to show the EDIT times.
   - Android `AttendanceLogicTest.kt`: same rows through `AttendanceLogic.pairs`.
   - Android resources test: the three messages equal the iOS copy (vi + en).
2. Fix (`fix(mobile): …`):
   - iOS `Model/Attendance.swift`: `AttendanceMonthRow.after` (decoded as `AttendanceRecord`); `pairs` applies the
     last EDIT per record.
   - Android `domain/attendance/AttendanceLogic.kt`: `pairs` applies the last EDIT per record.
   - Android `res/values{,-vi}/strings.xml`: iOS wording.
3. Verify: iOS build + unit tests on a Simulator, Android `:app:assembleDebug :app:testDebugUnitTest`.
4. Visible check on a local API (origin/dev, own DB): add a manual record with a reason, screenshot
   "Ca và công của tôi" on iOS and Android.
