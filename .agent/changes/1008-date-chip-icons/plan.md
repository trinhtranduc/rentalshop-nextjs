# Plan — Date chips: icons instead of "Lấy" / "Trả"

Issue: #1008 · Status: accepted · Spec: ./spec.md

## Steps

1. iOS model: `DateChip.Kind.symbolName`, `DateChip.accessibilityText`; `WorkChip` gets `dateKind` + `date` for the date chip (its `text` stays the full spoken text). Tests in `OrdersHomeTests.swift`.
2. iOS view: `DateChipStack.show` and `OrderRowCell.fillChipLines` draw an `NSTextAttachment` SF Symbol tinted with the chip text colour, centred on the text; `accessibilityLabel` = the full text.
3. Android model: `OrderRowDates.DateChip.accessibilityText`, `OrdersBoardLogic.chipIcon(kind)`. Tests in `OrdersHomeTest.kt`.
4. Android view: one `DateChipContent` (14.dp icon + date, `clearAndSetSemantics { contentDescription }`) used by `DateChipsRow`, the Việc cần làm chips and `CalendarV2Screen.DayRow`.
5. Skill: `mobile-parity` (both apps, iOS reference).
6. Verify: `xcodebuild … -scheme Development build`, iOS `OrdersHomeTests`; `./gradlew :app:assembleDebug :app:testDebugUnitTest`.

## Files

- `apps/mobile/POS ADBD/ViewModels/OrdersHomeViewModel.swift` — chip model
- `apps/mobile/POS ADBD/Viewcontrollers/Orders/OrderRowCell.swift` — chip drawing
- `apps/mobile/POS ADBDTests/OrdersHomeTests.swift` — tests
- `apps/mobile-android/.../domain/orders/OrderRowDates.kt`, `ui/orders/v2/OrdersBoardLogic.kt`, `ui/orders/v2/OrdersHomeScreen.kt`, `ui/calendar/v2/CalendarV2Screen.kt` — model and drawing
- `apps/mobile-android/app/src/test/.../ui/orders/OrdersHomeTest.kt` — tests

## Risks

- Icon misaligned with the text at small sizes — checked on simulator / emulator.

## Rollback

Revert the PR; UI only, no data.
