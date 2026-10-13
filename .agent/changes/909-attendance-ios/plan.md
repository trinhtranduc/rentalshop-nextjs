# Plan — iOS attendance (#909)

1. `Model/Attendance.swift`: Codable models (lenient) + `AttendanceLogic` (pure, unit-tested).
2. `Library/Services/AttendanceService.swift`: me, punch, month, shifts; error = code + message + data.
3. `Viewcontrollers/Attendance/`: `AttendanceViewController`, `AttendanceScanViewController` (AVFoundation +
   CoreLocation, Debug manual code), `MyShiftsViewController`.
4. `Merchant.modules`; Settings v2 first row; profile refresh of modules.
5. `InboxNotificationPayload` lenient; `SHIFT_CHANGED` in `NotificationsViewController` and
   `PushNotificationManager`.
6. Strings en / vi (append with `cat >>`, check `wc -l`); Info.plist purpose strings mention attendance.
7. Files into `project.pbxproj` (xcodeproj gem); tests `POS ADBDTests/AttendanceTests.swift`.
8. UI test `testAttendanceClockInOut` in `AnyRentE2ETests.swift` (Debug manual code).

Skills: mobile-parity (Android #910 copies this), timezone-dates (VN days), mobile-e2e-local.

## Verify
`cd apps/mobile && pod install && xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development
-destination 'generic/platform=iOS Simulator' -derivedDataPath /private/tmp/claude-billing/att909-dd build`;
unit tests on a simulator; e2e against the #907 branch API on :3192 with DB `anyrent_att_ios`.

## Rollback
Revert the PR. No API or data change.
