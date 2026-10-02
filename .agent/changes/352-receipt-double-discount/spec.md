# Spec — receipt totals

Issue: #352 · Status: accepted · Intent: ./intent.md

## Behavior

1. `computeReceiptTotals(order)`: subtotal = Σ item `totalPrice` (or quantity × unitPrice); discount = `discountAmount`;
   loyaltyDiscount = `loyaltyDiscount`; total = `totalAmount`. Without items: subtotal = total + discount + loyaltyDiscount.
2. `ReceiptPreviewModal` renders those four values; the loyalty line only when > 0.

## Acceptance

- [ ] 1 in `tests/packages/ui/receipt-totals.test.ts`
- [ ] 2 on localhost: a 20% order shows 130,000 / 26,000 / 104,000
