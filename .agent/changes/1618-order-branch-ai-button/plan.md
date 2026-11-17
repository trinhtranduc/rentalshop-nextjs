# Plan — Branch in order detail and AI button top right (apps)

Issue: #1618 · Status: in-progress · Spec: ./spec.md

## Steps

1. iOS: `OrderDetailLogic.branchName(_:role:activeOutletCount:)` + test; branch row in `OrderDetailViewController.statusBox`.
2. Android: `OrderDetailHeader.branchName(summary, role, activeOutletCount)` + test; branch row in `OrderDetailV2Screen` above the creator line.
3. iOS: `WeeklySummaryButton` compact header style; move it into the Overview title row; drop the bottom inset.
4. Android: `WeeklySummaryButton` compact; move it into the title row; drop `WeeklySummaryButtonClearance` padding.
5. Skills: `mobile-parity` (both apps), `i18n-keys` (accessibility label only if needed).
6. Verify: iOS `xcodebuild … build` + unit tests; Android `./gradlew :app:assembleDebug` + unit tests; visible Simulator / emulator screenshots.

## Files

- `apps/mobile/POS ADBD/ViewModels/OrderDetailLogic.swift`, `Viewcontrollers/OrderDetail/OrderDetailViewController.swift`
- `apps/mobile/POS ADBD/Viewcontrollers/Chart/OverviewV2ViewController.swift`, `WeeklySummaryViews.swift`
- `apps/mobile-android/.../domain/orders/OrderDetailHeader.kt`, `ui/orders/v2/OrderDetailV2Screen.kt`
- `apps/mobile-android/.../ui/overview/v2/OverviewV2Screen.kt`, `WeeklySummarySheet.kt` (button)
- tests next to the existing ones

## Risks

- Header row width on small phones (title + date + button): the date shrinks / truncates first.

## Rollback

Revert the PR; no data or API change.
