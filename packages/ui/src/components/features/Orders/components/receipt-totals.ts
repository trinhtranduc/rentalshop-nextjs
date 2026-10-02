/**
 * Receipt money lines (#352). `totalAmount` is stored after the discount (and the loyalty discount),
 * so it is the total, never the subtotal: using it as the subtotal subtracted the discount twice.
 */
export interface ReceiptTotalsInput {
  orderItems?: Array<{ quantity?: number | null; unitPrice?: number | null; totalPrice?: number | null }> | null;
  totalAmount?: number | null;
  discountAmount?: number | null;
  loyaltyDiscount?: number | null;
}

export interface ReceiptTotals {
  subtotal: number;
  discount: number;
  loyaltyDiscount: number;
  total: number;
}

export function computeReceiptTotals(order: ReceiptTotalsInput): ReceiptTotals {
  const items = order.orderItems || [];
  const discount = order.discountAmount || 0;
  const loyaltyDiscount = order.loyaltyDiscount || 0;
  const total = order.totalAmount || 0;
  const subtotal = items.length
    ? items.reduce((sum, item) => sum + (item.totalPrice || (item.quantity || 1) * (item.unitPrice || 0)), 0)
    : total + discount + loyaltyDiscount;
  return { subtotal, discount, loyaltyDiscount, total };
}
