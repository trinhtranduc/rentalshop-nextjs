# Spec — Create an order with a 0đ product

Issue: #996 · Status: in-progress · Intent: ./intent.md

## Behavior

1. A rent product with `rentPrice` 0 and no pricing options is priced 0đ for its own mode (FIXED unless `pricingType` is DAILY). Adding it to the cart shows 0đ and does not ask "Nhập giá". Create is allowed.
2. A rent product that already has a 0đ option still creates at 0đ (#951).
3. Switching that line to a mode the product has no price for (for example Theo ngày when it only has Theo lần) still asks for a price and blocks create until one is typed. Typed 0 is enough.
4. Clearing a typed price on a 0đ product returns the line to 0đ and does not ask again.
5. A sale price of 0 still means the product is not for sale. A sale line can still be 0đ.

## Out of scope

- API validation (unit price 0 is already accepted).
- Deposit, stock, availability, revenue.
- Forcing the user to type 0 before create.

## API and data

No request or response change. `orderItems[].unitPrice` may be 0, as it already may when the user types 0.

## Acceptance

- [x] Web: `firstMissing` is null for a rent line from a product with `rentPrice` 0 and no options
- [x] iOS and Android: the same product does not `needsPrice`, and the create payload sends `unitPrice` 0
- [x] A rent line switched to a mode with no price still blocks
