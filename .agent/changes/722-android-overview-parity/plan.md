# Plan — #722

1. `domain/overview/OverviewRelated.kt` (kinds, rows, page parser), `OverviewLogic.kt` (`cashCollected`, `heldCash`).
2. `data/ApiClient.kt` `incomeRows`; `ui/overview/v2/OverviewRelatedScreen.kt`; route in `AnyRentNavHost.kt`.
3. `OverviewV2Screen.kt`: tile, sheet, links, Đơn mới row; strings vi/en.
4. Verify:
   - `./gradlew :app:testDebugUnitTest --tests 'com.anyrent.pos.domain.overview.*'`.
   - `android-e2e.sh --fresh`, then `tests/e2e/mobile/android-overview-api.js` + `android-overview.sh`.
