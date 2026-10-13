# #927 Plan (iOS)

Status: in-progress.

1. Unit tests first (`AttendanceTests`): `required` decoding, `AttendanceCardLogic.shows`, card text of the three
   states (big number, line, button, green), elapsed format, today's pairs and day hours, not-required error copy.
   Commit them failing.
2. `Attendance.swift`: `required`, `AttendanceCardLogic`, error case. Strings vi/en appended.
3. `AttendanceCard.swift` (renamed from `AttendanceViewController.swift`, pbxproj path updated): card cell, punch flow,
   `AttendancePermissions` kept. `SettingsV2ViewController` uses it; month rows loaded for the done state; 1 s timer
   only while on shift and visible.
4. UI test `test9AttendanceClockInOut` follows the card (`settings.attendance.card`, `attendance.punch`, `attendance.result`).
5. Verify: Development build, unit tests on a Simulator; visible run against the #927 API branch (own worktree,
   port 3207, DB `anyrent_att_927_ios`): not in, on shift, done, required=false, scan success, one refusal.
   Screenshots `/private/tmp/claude-billing/att927-shots/ios/`.
6. PR into dev, Vietnamese body, `Refs #927`, needs the #927 API PR.
