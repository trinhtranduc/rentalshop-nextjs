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

export interface OutstandingPart {
  amount: number;
  orders: number;
}

/** Where `outstanding` will come from (#494); `atPickup.amount + overduePickup.amount = outstanding`. */
export interface OutstandingBreakdown {
  /** Not picked up yet with a pickup date today or later (or none), plus unfinished sales */
  atPickup: OutstandingPart;
  /** Rent orders still RESERVED whose pickup date is before `todayStart` */
  overduePickup: OutstandingPart;
}

/**
 * Splits the outstanding part of `summarizeOrderValue` by when it can be collected (#494).
 * `todayStart` is the UTC start of today's Vietnam civil day.
 */
export function splitOutstanding(
  orders: Array<{
    orderType: string;
    status: string;
    totalAmount?: number | null;
    depositAmount?: number | null;
    pickupPlanAt?: Date | string | null;
  }>,
  todayStart: Date
): OutstandingBreakdown {
  const result: OutstandingBreakdown = {
    atPickup: { amount: 0, orders: 0 },
    overduePickup: { amount: 0, orders: 0 }
  };
  for (const o of orders) {
    if (o.status === ORDER_STATUS.CANCELLED) continue;
    const total = o.totalAmount || 0;
    let owed = 0;
    let overdue = false;
    if (o.orderType === ORDER_TYPE.RENT && o.status === ORDER_STATUS.RESERVED) {
      owed = Math.max(0, total - (o.depositAmount || 0));
      overdue = o.pickupPlanAt != null && new Date(o.pickupPlanAt) < todayStart;
    } else if (o.orderType === ORDER_TYPE.SALE && o.status !== ORDER_STATUS.COMPLETED) {
      owed = total;
    }
    if (owed <= 0) continue;
    const part = overdue ? result.overduePickup : result.atPickup;
    part.amount += owed;
    part.orders += 1;
  }
  return result;
}
