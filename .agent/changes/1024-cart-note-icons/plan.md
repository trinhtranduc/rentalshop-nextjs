# Plan — Cart: icons for "Thêm món" and "Ghi chú"

Issue: #1024 · Status: in-progress · Spec: ./spec.md

## Steps

1. Logic (both platforms, same names): `CartV2Icon` (addItem / itemNote / orderNote with the platform symbol),
   `CartV2Logic.itemNoteLine(note)` (one-line text or nil = "Ghi chú"), `CartV2Logic.itemNoteSpoken(...)`.
2. iOS `CartV2ViewController.swift`: add button, `itemNoteButton`, order note row (`V2ValueRow` gets an optional leading icon).
3. Android `CartV2Screen.kt`: same three places (`V2ValueRow` gets an optional leading icon).
4. Strings (`i18n-keys`, mobile part): `products.cart.addItem.accessibility` (iOS en/vi), `v2_cart_add_item_accessibility` (Android values/values-vi).
5. Unit tests: iOS `ProductsV2Tests.swift`, Android `CartNoteIconsTest.kt`.
6. Verify: iOS unit tests on a new simulator, Android `:app:assembleDebug :app:testDebugUnitTest`.

## Files

- `apps/mobile/POS ADBD/Model/ProductsV2.swift` — logic
- `apps/mobile/POS ADBD/Viewcontrollers/Products/v2/CartV2ViewController.swift`, `ProductsV2Views.swift` — UI
- `apps/mobile/POS ADBD/{en,vi-VN}.lproj/Localizable.strings` — one key
- `apps/mobile-android/.../domain/products/ProductRules.kt` — logic
- `apps/mobile-android/.../ui/home/v2/CartV2Screen.kt`, `ProductsV2Components.kt` — UI
- `apps/mobile-android/app/src/main/res/values{,-vi}/strings.xml` — one key
- tests on both platforms

## Risks

- UI only; no payload change. A long or multi-line note must stay on one line.

## Rollback

Revert the PR.
