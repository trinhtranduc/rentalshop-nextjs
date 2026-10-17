# Plan — Late and not-prepared warnings without a coloured box

Issue: #1032 · Status: in-progress · Spec: ./spec.md

## Steps

1. iOS: `RowWarning` (`.late`, `.notPrepared`: colour, SF Symbol, font) in `OrdersHomeViewModel.swift`;
   `WorkChip.warning`; `workChips` / `calendarChips` tag the warnings. `OrderRowCell`: `RowWarningLabel`
   (icon + text, no fill), used by `fillChipLines` and the order-row pills (`addPill` → `addWarning`).
2. Android: `RowWarning` enum in `OrdersBoardLogic.kt`; `RowWarningText` composable in `OrdersHomeScreen.kt`;
   `BoardRow` pills, `WorkRow`, `NotPickedUpOrderRow` and `CalendarV2Screen.DayRow` use it.
2b. Lịch late note: iOS `CalendarDayRowCell.lateNote(days:fee:)`; Android `RowWarningText(suffix =)` with
   `RowWarning.feeSuffix`.
3. Tests: update the #1026 assertions that the warnings keep their fill (intentional change); add no fill,
   colour, icon, spoken text, badge still solid (iOS `OrdersHomeTests`, Android `OrdersHomeTest`).
4. Verify: iOS unit tests, Android `assembleDebug` + `testDebugUnitTest`.

## Files

- `apps/mobile/POS ADBD/ViewModels/OrdersHomeViewModel.swift`
- `apps/mobile/POS ADBD/Viewcontrollers/Orders/OrderRowCell.swift`
- `apps/mobile/POS ADBD/Viewcontrollers/Calendar/CalendarV2ViewController.swift`
- `apps/mobile/POS ADBDTests/OrdersHomeTests.swift`
- `apps/mobile-android/.../ui/orders/v2/OrdersBoardLogic.kt`, `OrdersHomeScreen.kt`
- `apps/mobile-android/.../ui/calendar/v2/CalendarV2Screen.kt`
- `apps/mobile-android/app/src/test/.../ui/orders/OrdersHomeTest.kt`

## Risks

Visual only; the warnings were never tappable.

## Rollback

Revert the commit.
