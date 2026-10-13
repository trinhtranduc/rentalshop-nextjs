# Plan — #935

1. Failing unit test in `POS ADBDTests/AttendanceTests.swift`: a late closed record shows times + hours + late;
   a late open record shows times + late. Commit.
2. `Attendance.swift`: `AttendanceWeekLine`, `AttendanceWeekRow.lines`, `weekRows` keeps hours on late records.
3. `MyShiftsViewController`: attributed text, late part amber.
4. `xcodebuild test -only-testing:POS ADBDTests/AttendanceTests` on a free Simulator; build; seed local API
   (`scripts/mobile-e2e/seed-local.sh`) with a late record for staff.outlet1, screenshot "Ca và công của tôi".
5. PR into `dev`, `Fixes #935`.
