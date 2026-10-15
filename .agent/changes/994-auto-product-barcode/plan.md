# Plan — Auto-generate a product barcode

Issue: #994 · Status: in-progress · Spec: ./spec.md

## Steps

1. Add `ProductBarcode.generate` next to `BarcodeMatch` on iOS (`ProductsV2.swift`) and Android (`ProductRules.kt`). Same inputs as the web `generateBarcode`.
2. iOS `ProductFormViewController`: fill the barcode on create; add a regenerate button beside the scan button.
3. Android `ProductFormV2Screen`: start create with a generated code; add a regenerate icon beside scan.
4. Strings: `products.form.regenerateBarcode` (iOS), `v2_form_regenerate_barcode` (Android).
5. Tests: iOS `ProductsV2Tests` + form load test; Android `ProductRulesTest`.
6. Skills: `i18n-keys` (mobile strings only; no new web key), `mobile-parity`. No API change, so no `api-compat-review` log row.

## Files

- `apps/mobile/POS ADBD/Model/ProductsV2.swift` — shared generator
- `apps/mobile/POS ADBD/Viewcontrollers/Products/v2/ProductFormViewController.swift` — fill + button
- `apps/mobile/POS ADBD/en.lproj/Localizable.strings` — label
- `apps/mobile/POS ADBD/vi-VN.lproj/Localizable.strings` — label
- `apps/mobile/POS ADBDTests/ProductsV2Tests.swift` — rule + form
- `apps/mobile-android/.../domain/products/ProductRules.kt` — shared generator
- `apps/mobile-android/.../ui/home/v2/ProductFormV2Screen.kt` — fill + button
- `apps/mobile-android/.../res/values/strings.xml` and `values-vi/strings.xml` — label
- `apps/mobile-android/.../domain/products/ProductRulesTest.kt` — rule

## Risks

- Two creates in the same millisecond can share the 8 clock digits; the 3 random digits make a collision rare. The unique index still rejects a real duplicate.
- Edit must not call generate on load, or a saved code would be replaced before the user notices.

## Rollback

Revert the commit. Products already saved keep their barcodes. No migration.
