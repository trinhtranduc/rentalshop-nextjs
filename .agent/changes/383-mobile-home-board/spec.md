# Spec — Mobile Home product list matches the approved board

Issue: #383 · Status: accepted · Intent: ./intent.md

## Behavior

1. The new Home has no category chips and no longer loads categories or sends `categoryId`. Search stays.
2. The image-search and barcode buttons are icon buttons at the trailing end inside the search field; each has
   a tap target of at least 44pt (iOS) / 48dp (Android) and an accessibility label. They open the same screens as before.
3. The line under the name shows the product code (barcode) and the stock ("AD-012 ● Còn 3" / "● Hết hôm nay"),
   never the category.
4. Prices are unchanged (per rental · per day · sale).
5. The add button keeps the filled-blue rounded square. When the product is in the cart it shows the cart quantity
   instead of + on `#1E3A8A`; out today it is grey as before (out wins). Tapping still adds one. Label:
   "<name>: <n> trong giỏ, thêm 1" when in the cart, "Thêm <name> vào giỏ" otherwise. The count follows the cart live.
6. The floating cart bar is primary blue `#1D4ED8` with white text.
7. With the flag off the old Home is unchanged.

## Out of scope

Quantity stepper on the list, product detail, cart screen, the old Home, API changes.

## API and data

None. `GET /api/products` is called without `categoryId`.

## Acceptance

- [ ] Unit tests: cart count by product id, row subtitle (code + stock, no category), add-button state.
- [ ] iOS `POS ADBDTests` and Android `:app:testDebugUnitTest :app:assembleDebug` green.
- [ ] Manual check on both apps as merchant2 with screenshots (flag on/off, count 2, out row, blue bar, search, scan/image).
- [ ] New strings in iOS `vi-VN`/`en` and Android `values`/`values-vi` (mobile only; no web locales).
