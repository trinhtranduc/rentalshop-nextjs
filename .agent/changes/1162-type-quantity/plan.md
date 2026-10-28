# Plan — Type a product quantity on the phone

Issue: #1162 · Status: done · Spec: ./spec.md

## Steps

1. Clamp the pad's number to the stepper minimum and to 9.999.
2. iOS `V2Stepper`: tap the number, present `NumberPickerViewController` with title "Nhập số lượng".
3. Android `V2Stepper`: same tap opens `AppNumericPadSheet`.
4. Strings in both phone languages.
5. Skills: `mobile-parity`, `i18n-keys` (phone strings only; no web locale). No API skill.

## Files

- `apps/mobile/POS ADBD/Model/ProductsV2.swift` — `QuantityEntry`
- `apps/mobile/POS ADBD/Viewcontrollers/Products/v2/ProductsV2Views.swift` — dialog on the stepper
- `apps/mobile/POS ADBD/en.lproj/Localizable.strings`, `vi-VN.lproj/Localizable.strings`
- `apps/mobile/POS ADBDTests/ProductsV2Tests.swift` — `QuantityEntryTests`
- `apps/mobile-android/.../domain/products/QuantityEntry.kt`
- `apps/mobile-android/.../ui/home/v2/ProductsV2Components.kt`
- `apps/mobile-android/.../res/values/strings.xml`, `values-vi/strings.xml`
- `apps/mobile-android/.../test/.../QuantityEntryTest.kt`

## Risks

UI only. A cart quantity of 0 still uses the existing remove confirmation. The dialog does not change prices.

## Rollback

Revert the commit. Installed builds never had the dialog.
