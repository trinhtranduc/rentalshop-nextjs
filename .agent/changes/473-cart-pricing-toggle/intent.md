# New cart: per-rental / per-day toggle missing for products with both prices

Issue: #473 · Author: Trinh Tran (agent) · Status: accepted · Created: 2026-10-05

## Problem

Owner, real iPhone on dev-api: "phần cart chưa chọn được thuê theo lần hay theo ngày". In the new cart
(flag `newProducts`) a rented line shows no "Theo lần / Theo ngày" toggle.

The toggle shows only when the cart line's own pricing options hold an active FIXED and an active DAILY
price. The API is fine: `GET /api/products` (as the Home tab calls it) and `GET /api/products/{id}` return
both options with numeric prices, and a fresh add builds a line that offers both modes. The line, though,
keeps the pricing it was built with:

- adding a product that is already in the cart only adds to the quantity;
- the cart is saved to disk and restored on launch;
- a line loaded from an existing order (edit order) has no pricing options.

So a product that got its per-day price after it was put in the cart, or any line of an edited order,
never shows the toggle.

## Proposed outcome

A rent line whose product has both prices always shows the toggle on iOS and Android, including lines
that were in the cart before the price was added and lines of an edited order. A product with only one
rental price shows no toggle, as today.

## Affected users and systems

Shops using the new cart on iOS and Android. No API or data change.

## Constraints

- Keep the line's quantity, chosen mode, typed prices and an edited order's unit price.
- Do not touch the product image viewer or notifications/notes files.

## Open questions

- Products on dev may simply have one rental price (`pricingOptions: []`, legacy `rentPrice` only). The old
  cart offered both modes on every rent line (the missing one at price 0); the new one does not. Owner to
  confirm the products tested have both prices.

## Decision log

- 2026-10-05 — Keep "no toggle with one price"; refresh stale lines from the product (caller).
