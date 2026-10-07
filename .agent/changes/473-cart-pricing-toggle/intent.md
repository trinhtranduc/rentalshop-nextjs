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

Owner decision (2026-10-05): "hiện cả 2 để user chọn 1 trong 2, có thể đổi giá".

- Every rent line in the new cart shows "Theo lần | Theo ngày", whatever prices the product has. Sale lines: no toggle.
- The line's unit price (this order only, never the product's price) can be edited at any time, pre-filled with the
  current price. Switching to a mode the product has no price for starts at 0 and opens the price editor.
- A rent line at price 0 blocks "Tạo đơn" with the "Lỗi" alert ("Nhập giá cho …").
- Lines added before the product got its second price, restored lines and edited-order lines still take the
  product's options (first fix), so a product with both prices starts with the right price in each mode.

## Affected users and systems

Shops using the new cart on iOS and Android. No API or data change.

## Constraints

- Keep the line's quantity, chosen mode, typed prices and an edited order's unit price.
- Do not touch the product image viewer or notifications/notes files.

## Open questions

- None.

## Findings (old cart, API)

- Old cart (iOS `ProductSelectedCell`, Android `CartCheckoutScreen`): the mode picker on every rent line, the
  missing mode at price 0 (iOS) or the previous price (Android); unit price editable by every role, no role check;
  price 0 was accepted.
- API `POST /api/orders` uses the client `unitPrice`, `totalPrice` and `pricingType` as sent ("Backend trusts frontend
  pricing - no recalculation"), with no role check on prices.

## Decision log

- 2026-10-05 — Refresh stale lines from the product (first fix, kept).
- 2026-10-05 — Owner: show both modes on every rent line; the line price is editable ("có thể đổi giá").
- 2026-10-05 — Owner: the edit is the price of the item in this cart/order only, never the product's price
  ("không phải sửa giá sp mà sửa giá tiền sp trong cart"); every role, OUTLET_STAFF included, may edit it (the
  AGENTS staff rule is for catalog prices). Editable at any time, also when the line already has a product price.
- 2026-10-05 — A rent line at price 0 blocks Tạo đơn (the old cart let it through).
