# Spec — Type a product quantity on the phone

Issue: #1162 · Status: done · Intent: ./intent.md

## Behavior

1. iOS and Android: the number in the − n + stepper is a button labeled "Nhập số lượng" / "Enter quantity". − and + still change the quantity by one.
2. Tapping the number opens the same number-pad sheet as price, deposit, and discount (`NumberPickerViewController` / `AppNumericPadSheet`), titled "Nhập số lượng".
3. The current quantity is the starting value. The first key replaces it (same as the money pad). Confirming sets that whole number.
4. A number below the stepper minimum becomes the minimum. A number above 9.999 becomes 9.999. The + button stops at 9.999.
5. Confirming the same number does not notify a change. Confirming 0 still goes through the existing cart rule: the app asks before removing the line.
6. Swiping the grabber down, or dismissing the sheet, leaves the quantity unchanged. There is no Cancel button (same as the money pad).

## Out of scope

- A different keypad only for quantity (no "000", no thousands grouping in the big number).
- Web quantity controls.
- A new maximum from stock or availability. The existing shortage warning still applies after the quantity changes.

## API and data

No API change. No new field.

## Acceptance

- [x] `QuantityEntry.fromPad` is covered by `QuantityEntryTests` (iOS) and `QuantityEntryTest` (Android)
- [x] iOS and Android both use the shared stepper and the existing number pad
- [x] New strings: iOS `products.stepper.enter` in `en` and `vi-VN`; Android `v2_stepper_enter` in `values` and `values-vi`. Confirm is the existing string on the pad.
- [x] No order, day, or role rule changes
