# #927 Android — Plan

Status: in-progress

1. Tests first (commit): `AttendanceCardTest` (required parsing, visibility, 3 states, lines, ticking elapsed,
   NOT_REQUIRED rejection), `Issue927ResourcesTest` (new strings vi/en).
2. Domain: `AttendanceMe.required`, `AttendanceCard` (pure), rejection kind.
3. Data: `AttendanceApi.todayPairs()`; `AttendanceCardStore` (last `me`, pairs, result).
4. UI: `AttendanceClockCard` in `SettingsV2Screen` and `SettingsScreen`; scanner route; drop `AttendanceScreen`.
5. Verify: `./gradlew :app:assembleDebug :app:testDebugUnitTest`; AVD `anyrent_e2e` :5570 against the #927 API
   (own worktree, own DB `anyrent_att_927_and`): screenshots of every state, required=false, success, refusal.
6. PR into `dev`, Vietnamese body, `Refs #927`, needs the #927 API PR.
