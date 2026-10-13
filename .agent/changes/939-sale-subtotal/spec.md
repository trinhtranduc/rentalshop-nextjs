# Spec — #939

SALE order, not a draft:

1. Subtotal = Σ item `totalPrice` (quantity × unit price as the server stored it).
2. Discount row only when `discountAmount > 0`, shown as is.
3. Total / Paid / To collect = server `totalAmount` (or the balance from it), never recomputed.
4. Subtotal − Discount ≠ Total (old data) → each number is still shown as stored.

Surfaces: Android `OrderDetailV2Screen` (sale "Tiền hàng"), Android `OrderShareModel.from` (sale "Tạm tính").
iOS `OrderDetailViewController` and `OrderShareModel.make` already follow 1–4; they move to one shared helper
`OrderDetailLogic.saleSubtotal` so both screens are covered by a test.

Out of scope: rentals, drafts, web, API.
