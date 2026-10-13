# Plan — #932

1. Failing unit test in `AttendanceLogicTest`: a late, closed record keeps its hours and adds late; commit.
2. Add `WeekLineText` + `weekLineText` in `AttendanceLogic.kt`; use it in `MyShiftsScreen.WeekRow` (amber late span).
3. `statusBarsPadding()` on the old `OnboardingScreen` Box.
4. `./gradlew :app:assembleDebug :app:testDebugUnitTest`; emulator `anyrent_e2e` (5570) screenshots of
   "Ca và công của tôi" with a late record and old onboarding Skip on a fresh install.
5. PR into `dev`, `Fixes #932`.
