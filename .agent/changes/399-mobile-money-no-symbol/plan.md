# Plan — Mobile: new screens show money without a currency symbol

Issue: #399 · Status: approved · Spec: ./spec.md

## Steps

1. Update the formatter tests first (iOS `FormattersTests`, Android `RedesignFormatTest`):
   no symbol, plus 0, negative and large cases; iOS `MoneyInput.display` case.
2. iOS: drop "đ" in `MoneyFormatter.format`; fix `MoneyInput.display` (no `dropLast`);
   drop the `replacingOccurrences(of: "đ")` in `OrderHandOverSheetViewController`;
   drop `unit: "đ"` in `ProductFormViewController`; add `amountChoiceTitle` to
   `NumberPickerViewController` and set it from `CartV2ViewController`.
3. Android: drop "đ" in `formatMoneyVnd` (name kept, doc updated); drop `unit = "đ"` in
   `ProductFormV2Screen`; cart discount chip uses a string resource.
4. Strings (`i18n-keys`): iOS `products.cart.discountAmount`, Android `v2_cart_discount_amount`, en + vi.
5. Verify: iOS `-only-testing:"POS ADBDTests"` on iPhone 16e; Android
   `./gradlew :app:testDebugUnitTest :app:assembleDebug`; iOS manual screenshots against a
   local API (home, cart, orders, order detail, overview, calendar). Android has no free
   emulator, so it is checked by unit tests and the build only.

## Files

- `apps/mobile/POS ADBD/Utils/DesignTokens.swift` — formatter
- `apps/mobile/POS ADBD/Model/ProductsV2.swift` — `MoneyInput.display`
- `apps/mobile/POS ADBD/Viewcontrollers/OrderDetail/OrderHandOverSheetViewController.swift`
- `apps/mobile/POS ADBD/Viewcontrollers/Products/v2/ProductFormViewController.swift`
- `apps/mobile/POS ADBD/Viewcontrollers/Products/v2/CartV2ViewController.swift`
- `apps/mobile/POS ADBD/Viewcontrollers/NumberPicker/NumberPickerViewController.swift` — opt-in title only
- `apps/mobile-android/.../ui/common/UiHelpers.kt` — formatter
- `apps/mobile-android/.../ui/home/v2/ProductFormV2Screen.kt`, `CartV2Screen.kt`
- strings (iOS en/vi `Localizable.strings`, Android `values`/`values-vi`)
- tests

## Risks

- Merge conflicts with #396 (same screens). Diff kept to the lines above.

## Rollback

Revert the commits; no data or API involved.
