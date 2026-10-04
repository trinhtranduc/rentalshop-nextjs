# Plan — Mobile products, product form, rent and sale cart

Issue: #373 · Status: accepted · Spec: ./spec.md

## Steps

1. iOS pure logic `Model/ProductsV2.swift` (role rules, form validation, error mapping, barcode match, cart line
   text/totals) + tests `POS ADBDTests/ProductsV2Tests.swift`.
2. iOS UI `Viewcontrollers/Products/v2/`: `ProductsHomeViewController`, `ProductDetailViewController`,
   `ProductFormViewController`, `CartV2ViewController`; `TabbarViewController` picks the Home root by flag.
   Small additive model changes: `Product.outletStock` decode, `images` in product request form data (nil for old screens),
   `STOCK_BELOW_RENTED` in `ErrorCodes.swift`.
3. Android pure logic `domain/products/ProductRules.kt` + tests; UI `ui/home/v2/` (list, detail, form, cart);
   `MainTab.Home` and new routes in `AnyRentNavHost` picked by flag; `ApiClient` product calls reused / extended
   additively (kept image URLs); `STOCK_BELOW_RENTED` in `ApiErrorMessages.kt`.
4. Strings vi/en on both apps.
5. Skills: `mobile-parity`, `i18n-keys`, `timezone-dates`.

## Verify

```bash
cd apps/mobile && xcodebuild -workspace "POS ADBD.xcworkspace" -scheme Development -destination 'platform=iOS Simulator,name=iPhone 17' -only-testing:"POS ADBDTests" test
cd apps/mobile-android && ./gradlew :app:testDebugUnitTest :app:assembleDebug
```
Manual: local API with `MOBILE_FEATURES=newProducts`; `staff.outlet2` (OUTLET_STAFF) vs `merchant2` (MERCHANT),
same merchant; flag on and off.

## Risks

- Product edit replaces images: the new form always sends the kept URLs.
- Multi-outlet merchant: quantity edits the user's outlet, else the product's first outlet row (same as today).

## Rollback

Turn `newProducts` off in app-config; the old screens return on next launch.
