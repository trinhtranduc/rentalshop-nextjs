# Plan — Create an order with a 0đ product

Issue: #996 · Status: in-progress · Spec: ./spec.md

## Steps

1. Treat a legacy rent price of 0 as a price of that mode in the three carts.
2. Update the #951 tests that expected "no options + rentPrice 0" to ask for a price.
3. Skills: `mobile-parity`. No API change, so no `api-compat-review` log row.

## Files

- `apps/client/app/orders/create/create-model.ts` — `catalogRentPrice` accepts 0
- `tests/web-create-order-model.test.ts`
- `apps/mobile/POS ADBD/Model/ProductsV2.swift` — `perRental` / `perDay` accept 0
- `apps/mobile/POS ADBD/Model/CartItem.swift` — a 0 rent price is not missing
- `apps/mobile/POS ADBDTests/ProductsV2Tests.swift`
- `apps/mobile-android/.../ProductRules.kt` — `perRental`, `perDay`, `catalogPrice`
- `apps/mobile-android/.../CartZeroPriceLinesTest.kt`

## Risks

Old carts saved before #951 treated a 0 line as "ask for a price" when `priceMissing` was absent. A product whose own rent price is now 0 will not ask. A line on a mode the product does not price still asks.

## Rollback

Revert the commit. Orders already saved at 0đ stay saved.
