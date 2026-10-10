import { ORDER_STATUS, ORDER_TYPE } from '@rentalshop/constants';

/**
 * What the counter collects (`amountDue`) or hands back (`refundDue`) for an order right now (#362).
 * Same rule as the QR payment amount:
 * - SALE: total − completed SALE payments.
 * - RENT RESERVED (at hand-over): total − deposit + collateral money − completed PICKUP payments.
 * - RENT PICKUPED (at return): late + damage fees + extra rent of a gia hạn (`totalAmount − pickupTotalAmount`,
 *   #505; zero when no pickup total was recorded) − collateral money − completed RETURN_ADJUSTMENT payments;
 *   a negative result is collateral money to give back.
 * - Anything else: nothing.
 */
export interface OrderBalanceInput {
  orderType?: string | null;
  status?: string | null;
  totalAmount?: number | null;
  /** #505: total collected at hand-over; null = never recorded, nothing extended */
  pickupTotalAmount?: number | null;
  depositAmount?: number | null;
  securityDeposit?: number | null;
  lateFee?: number | null;
  damageFee?: number | null;
  payments?: { amount?: number | null; status?: string | null; notes?: string | null }[] | null;
}

export function computeOrderBalance(order: OrderBalanceInput): { amountDue: number; refundDue: number } {
  const paid = (notes: string) =>
    (order.payments || [])
      .filter((payment) => payment.status === 'COMPLETED' && payment.notes === notes)
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);

  if (order.orderType === ORDER_TYPE.SALE) {
    return { amountDue: Math.max(0, (order.totalAmount || 0) - paid('SALE')), refundDue: 0 };
  }
  if (order.orderType === ORDER_TYPE.RENT && order.status === ORDER_STATUS.RESERVED) {
    const due = (order.totalAmount || 0) - (order.depositAmount || 0) + (order.securityDeposit || 0) - paid('PICKUP');
    return { amountDue: Math.max(0, due), refundDue: 0 };
  }
  if (order.orderType === ORDER_TYPE.RENT && order.status === ORDER_STATUS.PICKUPED) {
    const extension = order.pickupTotalAmount == null ? 0 : (order.totalAmount || 0) - order.pickupTotalAmount;
    const net =
      (order.damageFee || 0) + (order.lateFee || 0) + extension - (order.securityDeposit || 0) - paid('RETURN_ADJUSTMENT');
    return { amountDue: Math.max(0, net), refundDue: Math.max(0, -net) };
  }
  return { amountDue: 0, refundDue: 0 };
}
