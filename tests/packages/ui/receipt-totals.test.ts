/**
 * #352 — the receipt subtracted the discount twice: it used `totalAmount` (already discounted)
 * as the subtotal. Order #382509: 80,000 + 50,000, 20% off showed 104,000 → 78,000.
 */
import { computeReceiptTotals } from '../../../packages/ui/src/components/features/Orders/components/receipt-totals';

const items = [
  { quantity: 1, unitPrice: 80000, totalPrice: 80000 },
  { quantity: 1, unitPrice: 50000, totalPrice: 50000 },
];

describe('computeReceiptTotals (#352)', () => {
  it('subtotal is the sum of the items; total is the stored totalAmount', () => {
    expect(
      computeReceiptTotals({ orderItems: items, totalAmount: 104000, discountAmount: 26000 })
    ).toEqual({ subtotal: 130000, discount: 26000, loyaltyDiscount: 0, total: 104000 });
  });

  it('no discount: subtotal equals total', () => {
    expect(computeReceiptTotals({ orderItems: items, totalAmount: 130000, discountAmount: 0 })).toEqual({
      subtotal: 130000,
      discount: 0,
      loyaltyDiscount: 0,
      total: 130000,
    });
  });

  it('keeps the loyalty discount on its own line', () => {
    expect(
      computeReceiptTotals({ orderItems: items, totalAmount: 94000, discountAmount: 26000, loyaltyDiscount: 10000 })
    ).toEqual({ subtotal: 130000, discount: 26000, loyaltyDiscount: 10000, total: 94000 });
  });

  it('falls back to quantity × unit price when an item has no total', () => {
    const r = computeReceiptTotals({ orderItems: [{ quantity: 2, unitPrice: 50000 }], totalAmount: 100000 });
    expect(r.subtotal).toBe(100000);
  });

  it('without items, rebuilds the subtotal from the total and the discounts', () => {
    expect(computeReceiptTotals({ orderItems: [], totalAmount: 104000, discountAmount: 26000 }).subtotal).toBe(130000);
  });
});
