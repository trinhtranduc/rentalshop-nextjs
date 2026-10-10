# Plan — #725

1. `domain/overview/OverviewDashLogic.kt` (chips, ranges, tiles, chips, compact money, forecast, chart bars,
   waterfall, splits, collateral rows, today card); parse `series[].expectedCollected`,
   `revenue.orderValueByType`, `tomorrow` in `OverviewLogic.kt`. Tests in `OverviewDashLogicTest.kt`.
2. `OverviewV2ViewModel.kt`: chip + custom range, second report for the chart range.
3. `OverviewV2Screen.kt` redrawn; strings `overview_dash_*` in `values` and `values-vi` copied from iOS.
4. `tests/e2e/mobile/android-overview.sh` (+ `-api.js` prints the Hôm nay figures) for the new labels.
5. Verify: `./gradlew :app:testDebugUnitTest --tests 'com.anyrent.pos.domain.overview.*'`, `:app:assembleDebug`,
   emulator `anyrent_371` screenshots vs iOS 72–74, e2e numbers vs API.
