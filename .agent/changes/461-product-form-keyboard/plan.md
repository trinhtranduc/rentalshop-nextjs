# Plan — Number pad covers "Lưu sản phẩm" in the new product form

Issue: #461 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing tests first (`bug-fix-tdd`), committed alone:
   - iOS `POS ADBDTests/ProductsV2Tests.swift`: Done bar on the four price fields (spec 1), save button tied
     to the keyboard layout guide (spec 2), typing "3","0" into "Thuê theo ngày" gives "30" (spec 4, guard,
     expected to pass), Done bar on the handover/return/extend/customer phone fields (spec 5).
   - Android `ProductRulesTest.kt`: keystroke formatting guard (spec 7, expected to pass).
2. iOS shared helper `KeyboardDoneBar.attach(_:)` in `Viewcontrollers/Products/v2/ProductsV2Views.swift`
   (no new file, no project edit).
3. iOS `ProductFormViewController.swift`: attach the bar to numeric fields, save button bottom to
   `keyboardLayoutGuide`, reveal the focused field on `UIKeyboardDidShow` / begin editing, IQKeyboardManager
   off in `viewWillAppear` and restored in `viewWillDisappear`.
4. iOS `OrderHandOverSheetViewController.swift`, `OrderExtendSheetViewController.swift`,
   `NewCustomerViewController.swift`, `EditCustomerViewController.swift`: attach the bar.
5. Android `ui/home/v2/ProductFormV2Screen.kt`: move `imePadding()` to the screen column; numeric
   `BasicTextField` gets `ImeAction.Done` + `focusManager.clearFocus()`.
6. Skills: `mobile-parity` (UI parity only), `verify-change`.

## Verify

- `cd apps/mobile && pod install && xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development -destination 'generic/platform=iOS Simulator' -derivedDataPath <worktree>/build/ios build`
- `xcodebuild test … -only-testing:"POS ADBDTests"` on a simulator booted for this run (not the owner's).
- `cd apps/mobile-android && ./gradlew :app:testDebugUnitTest :app:assembleDebug`
- Manual (reviewer, simulator/device): open Thêm sản phẩm, tap "Thuê theo ngày": "Xong" bar shows, the
  save bar sits above it, "Xong" closes the pad; Android: save bar above the keyboard, Done closes it.

## Files

- `apps/mobile/POS ADBD/Viewcontrollers/Products/v2/ProductsV2Views.swift` — Done bar helper
- `apps/mobile/POS ADBD/Viewcontrollers/Products/v2/ProductFormViewController.swift` — keyboard layout
- `apps/mobile/POS ADBD/Viewcontrollers/OrderDetail/OrderHandOverSheetViewController.swift` — Done bar
- `apps/mobile/POS ADBD/Viewcontrollers/OrderDetail/OrderExtendSheetViewController.swift` — Done bar
- `apps/mobile/POS ADBD/Viewcontrollers/Customer/v2/NewCustomerViewController.swift` — Done bar on phone
- `apps/mobile/POS ADBD/Viewcontrollers/Customer/v2/EditCustomerViewController.swift` — Done bar on phone
- `apps/mobile/POS ADBDTests/ProductsV2Tests.swift` — tests
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/ui/home/v2/ProductFormV2Screen.kt` — IME padding, Done
- `apps/mobile-android/app/src/test/java/com/anyrent/pos/domain/products/ProductRulesTest.kt` — guard test

## Risks

- IQKeyboardManager off on the product form: the form now handles the keyboard itself (same pattern as the
  new customer screens). Restored on disappear.
- No API or data change; nothing for apps already in the field.

## Rollback

Revert the PR; UI only.
