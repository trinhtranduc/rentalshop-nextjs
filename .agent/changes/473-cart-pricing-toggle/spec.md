# Spec — New cart: per-rental / per-day toggle missing for products with both prices

Issue: #473 · Status: accepted · Intent: ./intent.md

## Behavior

1. Fresh pricing rule, iOS `CartItem.refreshPricing(from: Product)` and Android
   `CartV2Logic.withFreshPricing(line, product)`: when the product has both a per-rental and a per-day price
   and the line does not yet offer both, the line takes the product's active pricing options. Quantity,
   chosen mode (`pricingType`), the price in use and typed prices stay. Otherwise the line is unchanged.
2. Adding a product that is already in the cart applies rule 1 with the added product (iOS `Cart.addItem`,
   Android `CartStore.addProduct`).
3. The new cart, on open (iOS `viewWillAppear`; Android when the line ids change), loads
   `GET /api/products/{id}` once per screen for each rent line that does not offer both modes, and applies
   rule 1 (iOS `CartStore.refreshPricing(from:)`, Android `CartStore.refreshPricing(product)`). Errors are
   ignored (the line stays as it is).
4. A product with only one rental price still shows no toggle.

## Out of scope

- API, old cart, layout of the cart row.

## API and data

None. Uses the existing `GET /api/products/{id}`.

## Acceptance

- iOS `ProductsV2Tests`: a realistic `GET /api/products` row with both options gives a line that offers both
  modes; a stale single-price line gets the toggle after the same product is added again; an edit-order line
  gets it after a refresh, keeping its unit price; a one-price product stays without toggle.
- Android products v2 unit test: same cases, `ApiClient.parseProduct` on the JSON row.
- iOS build + `POS ADBDTests`; Android `:app:testDebugUnitTest :app:assembleDebug`.
