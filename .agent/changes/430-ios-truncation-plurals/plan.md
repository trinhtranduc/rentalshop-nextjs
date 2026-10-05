# Plan — iOS truncated names and English plurals

Issue: #430 · Status: approved · Spec: ./spec.md

## Steps

1. Failing tests: `apps/mobile/POS ADBDTests/Issue430Tests.swift` (row name width, plural keys, en strings);
   `apps/mobile-android/app/src/test/java/com/anyrent/pos/res/Issue430ResourcesTest.kt`. Commit alone.
2. iOS row: money labels hug `.required`; the name resists compression above the other labels' hugging
   (`OrderRowCell.swift`). Root cause: name compression 250 < label hugging 251, so Auto Layout cut the
   name and gave the spare width to the (right-aligned) money column.
3. iOS title: own nav title label with `adjustsFontSizeToFitWidth` (`OrderDetailViewController.swift`).
4. iOS plurals: `PluralText` next to `LateText` (`ProductDetailV2Logic.swift`); use it in the orders tab,
   order detail, hand-over sheet, filter sheet, products home and cart; add `.one` keys to `en`/`vi-VN`.
5. Android plurals: convert the strings to `<plurals>` and update call sites.
6. Verify: iOS build + `Issue430Tests` and `Phase7GapsTests` on a simulator; `./gradlew :app:assembleDebug`
   and the resources unit test.

## Files

- `apps/mobile/POS ADBD/Viewcontrollers/Orders/OrderRowCell.swift` — row priorities
- `apps/mobile/POS ADBD/Viewcontrollers/OrderDetail/OrderDetailViewController.swift` — title, plurals
- `apps/mobile/POS ADBD/Model/ProductDetailV2Logic.swift` — `PluralText`
- call sites in Orders, OrderDetail, Products/v2, `ProductsV2.swift`, `OrdersHomeViewModel.swift`
- `en.lproj` / `vi-VN.lproj/Localizable.strings`
- Android `values/strings.xml`, `values-vi/strings.xml`, orders/home v2 screens, `OrdersBoardLogic.kt`

## Risks

- The priority change could squeeze the item line; the money column still never compresses.

## Rollback

Revert the PR; no data or API change.
