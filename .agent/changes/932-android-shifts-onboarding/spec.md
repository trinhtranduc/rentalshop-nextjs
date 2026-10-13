# Spec — #932

1. `AttendanceLogic.weekLineText(line, hoursText, lateText)` returns the main text and an optional late text:
   - closed record: `"08:07–12:00 · 3,9 g"`; late adds `"muộn 7′"` (late never replaces the hours)
   - open record: `"08:07–…"`, plus late when late
   - not late: late text is `null`
   `MyShiftsScreen.WeekRow` draws main text in the normal colour, then ` · muộn N′` in amber (`AttendanceColors.Late`).
2. `OnboardingScreen` (old, `AuthScreens.kt`): the screen Box applies `statusBarsPadding()` after its background,
   so Skip (TopEnd) and the content start below the status bar / cutout. Background stays full-bleed.

API: không đổi. iOS: reference row is times + hours (+ late); no iOS change in this issue.
