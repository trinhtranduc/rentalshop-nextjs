# Spec — Hide the call button on late rows of "Việc cần làm"

Issue: #468 · Status: accepted · Intent: ./intent.md

## Behavior

1. `OrdersHomeLogic.workCallPhone(_:isLate:)` (iOS) and `OrdersBoardLogic.workCallPhone(row, isLate)` (Android)
   return no phone (nil / null) for every work row, late or not, with or without a customer phone.
2. iOS `OrderRowCell` binds a work row with the call button hidden; the hidden button leaves the stack view, so the
   total and chevron sit at the right edge (no gap).
3. Android `WorkRow` passes that result to `BoardRow`, which composes no call box when the phone is null.
4. Order detail call actions are unchanged.
5. Order row status tag (iOS `RowTagLabel(style: .status)`, Android `RowTagStyle.STATUS`): `DS.TextSize.secondary`
   (14) bold, padding 3 vertical / 8 horizontal, corner radius `DS.Radius.tag` (new token, 7) on both platforms.
6. Order row note pills (`.note` / `RowTagStyle.NOTE`): `DS.TextSize.pill` (12) regular, padding 2/6, radius
   `DS.Radius.chip` (6), same colours.
7. The name beside the bigger tag still wraps to two lines and is not cut (existing #430 test).
8. Home product row stock label ("● Còn N" / "● Hết hôm nay"): 14pt regular, colours unchanged (green / orange /
   red).

## Out of scope

- Order detail, customer detail and any API change.

## API and data

None.

## Acceptance

- iOS `OrdersHomeTests`: logic returns nil for a late row with a phone; a configured late work cell shows no call
  button.
- Android `OrdersHomeTest`: logic returns null for a late row with a phone.
- iOS `OrdersHomeTests.testStatusTagIsBiggerAndNotesAreRegular`, `ProductsV2Tests.testStockLabelIsRegularWeight`;
  Android `OrdersHomeTest` checks `RowTagStyle` values.
- iOS build + `POS ADBDTests`; Android `:app:testDebugUnitTest :app:assembleDebug`.
