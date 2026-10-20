/**
 * #1070 (owner chose "cách A"): a manual discount above the order lines is clamped, never rejected.
 *
 * Installed iOS / Android apps send `discountAmount` unclamped (an amount above the lines, or a percentage
 * above 100) together with a `totalAmount` they already clamp to 0, so a 400 would stop them creating or
 * editing the order. The server keeps accepting the request and stores a discount no larger than the lines:
 * `discountAmount` ≤ Σ line totalPrice; a percentage `discountValue` ≤ 100; an amount `discountValue` ≤ Σ lines
 * (so reopening the order shows the clamped number). `totalAmount` is not touched: the API stores the
 * client's total, as before.
 */
export interface OrderDiscountInput {
  discountType?: string | null;
  discountValue?: number | null;
  discountAmount?: number | null;
}

export interface ClampedOrderDiscount {
  /** undefined when the client did not send it */
  discountValue: number | undefined;
  discountAmount: number | undefined;
  clamped: boolean;
}

const isPercentage = (type?: string | null) => type === 'percentage' || type === 'percent';

export function clampOrderDiscount(input: OrderDiscountInput, linesTotal: number): ClampedOrderDiscount {
  const lines = Math.max(0, Number(linesTotal) || 0);
  const sent = (v: number | null | undefined) => (v === undefined || v === null ? undefined : Number(v));
  const value = sent(input.discountValue);
  const amount = sent(input.discountAmount);
  const valueCap = isPercentage(input.discountType) ? 100 : lines;

  const discountValue = value !== undefined && value > valueCap ? valueCap : value;
  const discountAmount = amount !== undefined && amount > lines ? lines : amount;
  return { discountValue, discountAmount, clamped: discountValue !== value || discountAmount !== amount };
}

type Line = { totalPrice?: number | null; quantity?: number | null; unitPrice?: number | null };

/** Σ totalPrice of order lines (the stored or the sent ones); a sent line without totalPrice is quantity × unitPrice,
 * as the create route computes it */
export function sumLineTotals(items: Line[] | null | undefined): number {
  return (items ?? []).reduce((sum, item) => {
    const total = item?.totalPrice ?? (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0);
    return sum + (Number(total) || 0);
  }, 0);
}
