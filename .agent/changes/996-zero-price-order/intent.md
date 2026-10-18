# Create an order with a 0đ product

Issue: #996 · Author: agent · Status: in-progress · Created: 2026-10-15

## Problem

Creating a rent order blocks a product whose rent price is 0 and that has no pricing option. The cart shows "Nhập giá" and will not submit. A product saved with a 0đ option already goes through (#951). A product stored as `rentPrice` 0 does not.

## Proposed outcome

A rent product priced 0 can be added to an order at 0đ. The cart does not ask for a price and create is allowed. Switching to a pricing mode the product does not have still asks for a price. A negative price is still refused.

## Affected users and systems

Every role that creates orders. Client web, iOS, Android. No API change.

## Constraints

- `salePrice` 0 stays "not for sale".
- Deposit, stock, availability and revenue rules stay as they are.
- Installed apps keep their own cart check until they are updated.

## Open questions

None. The owner asked for this outcome.

## Decision log

- 2026-10-15 — A rent price of 0 on the product's own mode is a real 0đ price, including a product with `rentPrice` 0 and no options. A mode the product does not price still asks. (owner)
