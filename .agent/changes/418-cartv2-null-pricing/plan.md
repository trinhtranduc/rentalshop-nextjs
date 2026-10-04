# Plan — Mobile: cart sends pricing type "NULL" for products without one

Issue: #418 · Status: approved · Spec: ./spec.md

## Root cause

`ApiClient.parseProduct` reads `o.optString("pricingType", "FIXED").uppercase()`. For a JSON
`null` value `org.json` returns the string `"null"` (the default applies only to a missing key),
so the product, and every `CartLine` made from it, holds `"NULL"`. Both Android carts share
`CartStore` and `ApiClient.createOrder`, which sends `pricingTypesByProduct[id] ?: "FIXED"`
as is.

## Steps

1. Test first: `app/src/test/java/com/anyrent/pos/data/CartNullPricingTest.kt` parses a product
   with a null pricing type, builds the cart line and the `createOrder` body (fake OkHttp
   interceptor), and checks the toggle rule. Commit `test(mobile): … (#418)`; it must fail on
   `"NULL"`.
2. Fix: one `PricingTypes.normalize` helper; `parseProduct` (product and options),
   `createOrder` / `updateOrder` items and the draft restore call it.
   Commit `fix(mobile): … (#418)`.
3. Verify: `./gradlew :app:testDebugUnitTest :app:assembleDebug`, iOS `POS ADBDTests`, manual
   rent order with products 32 and 33 in the new cart on both apps against the local API, DB rows.

## Files

- `apps/mobile-android/app/src/main/java/com/anyrent/pos/domain/products/ProductRules.kt`
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/data/ApiClient.kt`
- `apps/mobile-android/app/src/main/java/com/anyrent/pos/data/CartStore.kt` (restore line only)
- `apps/mobile-android/app/src/test/java/com/anyrent/pos/data/CartNullPricingTest.kt` (new)

## API compatibility (installed apps)

No API change.
