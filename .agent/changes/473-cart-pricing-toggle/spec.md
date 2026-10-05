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
4. Toggle: iOS `CartV2Logic.showsPricingToggle(orderType:)`, Android `CartV2Logic.showsPricingToggle(isSale)`: every
   rent line, never a sale line.
5. Switching mode: the line takes the product's price for that mode (an option, or the legacy `rentPrice` for its
   own mode), else a price already typed for that mode (iOS), else 0. Android: catalog price clears the override,
   otherwise the override becomes 0 (was: kept the previous mode's price; iOS parity).
6. After a switch that leaves the line at 0 (`needsPrice`), the cart opens the price editor.
7. Price editor: tap the price line (calc text with a pencil) on any line, any role; pre-filled with the current
   unit price; iOS `CartStore.updatePrice(at:price:)` (per-mode custom price), Android `CartStore.updateUnitPrice`.
   The product is never changed.
8. Validation before Tạo đơn: `CartV2Logic.missingPrices` lists rent lines at price ≤ 0; each adds
   "Nhập giá cho %@" to the existing "Lỗi" alert (iOS `products.cart.needPrice`, Android `v2_cart_need_price`).
9. Totals and request unchanged: per-day = unit × qty × days, per-rental = unit × qty; the create request carries the
   edited `unitPrice`, `totalPrice` and `pricingType` (the API trusts them).

## Out of scope

- API, old cart.

## API and data

None. Uses the existing `GET /api/products/{id}`.

## Acceptance

- Owner decision cases (both apps): toggle on every rent line; a mode without a price starts at 0, needs a price and
  blocks create; editing a line that has a product price; the edited per-day price in totals and the create request.
- iOS `ProductsV2Tests`: a realistic `GET /api/products` row with both options gives a line that offers both
  modes; a stale single-price line gets the toggle after the same product is added again; an edit-order line
  gets it after a refresh, keeping its unit price; a one-price product stays without toggle.
- Android products v2 unit test: same cases, `ApiClient.parseProduct` on the JSON row.
- iOS build + `POS ADBDTests`; Android `:app:testDebugUnitTest :app:assembleDebug`.
