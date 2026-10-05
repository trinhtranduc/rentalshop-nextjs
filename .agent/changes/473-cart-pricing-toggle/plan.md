# Plan — New cart: per-rental / per-day toggle missing for products with both prices

Issue: #473 · Status: accepted · Spec: ./spec.md

## Steps

1. Tests first (fail): iOS `POS ADBDTests/ProductsV2Tests.swift`, Android products v2 unit test.
2. iOS: `Model/CartItem.swift` (`refreshPricing(from:)`), `Model/Cart.swift` (`addItem`, `refreshPricing`),
   `ViewModels/CartStore.swift` (`refreshPricing(from:)`), `Viewcontrollers/Products/v2/CartV2ViewController.swift`
   (load products of stale rent lines on appear).
3. Android: `domain/products/ProductRules.kt` (`CartV2Logic.withFreshPricing`), `data/CartStore.kt`
   (`addProduct`, `refreshPricing`), `ui/home/v2/CartV2Screen.kt` (load products of stale rent lines).
4. Skill `mobile-parity`: same rule in both apps. No API change.

## Verification

- Android: `./gradlew :app:testDebugUnitTest :app:assembleDebug`
- iOS: `xcodebuild … -scheme Development build`, then `POS ADBDTests` on a spare simulator.

## Risks

- One extra `GET /api/products/{id}` per stale rent line when the cart opens (once per screen).

## Rollback

Revert the PR.
