import { ORDER_STATUS, ORDER_TYPE } from '@rentalshop/constants';

export interface OrderValueSummary {
  totalOrderValue: number;
  outstanding: number;
}

/**
 * Order value of orders created in a period and what is still uncollected (#484).
 * Callers pass non-cancelled orders. Rent RESERVED owes `totalAmount - depositAmount`;
 * a sale not COMPLETED owes its total; picked-up, returned and completed orders are paid.
 */
export function summarizeOrderValue(
  orders: Array<{ orderType: string; status: string; totalAmount?: number | null; depositAmount?: number | null }>
): OrderValueSummary {
  let totalOrderValue = 0;
  let outstanding = 0;
  for (const o of orders) {
    if (o.status === ORDER_STATUS.CANCELLED) continue;
    const total = o.totalAmount || 0;
    totalOrderValue += total;
    if (o.orderType === ORDER_TYPE.RENT && o.status === ORDER_STATUS.RESERVED) {
      outstanding += Math.max(0, total - (o.depositAmount || 0));
    } else if (o.orderType === ORDER_TYPE.SALE && o.status !== ORDER_STATUS.COMPLETED) {
      outstanding += total;
    }
  }
  return { totalOrderValue, outstanding };
}
