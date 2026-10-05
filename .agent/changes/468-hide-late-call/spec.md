# Spec — Hide the call button on late rows of "Việc cần làm"

Issue: #468 · Status: accepted · Intent: ./intent.md

## Behavior

1. `OrdersHomeLogic.workCallPhone(_:isLate:)` (iOS) and `OrdersBoardLogic.workCallPhone(row, isLate)` (Android)
   return no phone (nil / null) for every work row, late or not, with or without a customer phone.
2. iOS `OrderRowCell` binds a work row with the call button hidden; the hidden button leaves the stack view, so the
   total and chevron sit at the right edge (no gap).
3. Android `WorkRow` passes that result to `BoardRow`, which composes no call box when the phone is null.
4. Order detail call actions are unchanged.

## Out of scope

- Order detail, customer detail and any API change.

## API and data

None.

## Acceptance

- iOS `OrdersHomeTests`: logic returns nil for a late row with a phone; a configured late work cell shows no call
  button.
- Android `OrdersHomeTest`: logic returns null for a late row with a phone.
- iOS build + `POS ADBDTests`; Android `:app:testDebugUnitTest :app:assembleDebug`.
