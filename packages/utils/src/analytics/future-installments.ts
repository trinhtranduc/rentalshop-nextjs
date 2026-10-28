/**
 * Unpaid deposit stages by the day they fall due (#1199). Additive field `futureInstallments` of the analytics
 * responses: `[{ dueDateKey: 'YYYY-MM-DD', amount, count }]`. It is never part of `futureIncome` (old Android adds
 * `futureIncome` to the revenue bar, so a stage there would be counted twice). Left out of the response when empty,
 * so a shop without deposit plans gets the exact response it got before.
 */
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { ORDER_STATUS, ORDER_TYPE } from '@rentalshop/constants';
import { getFutureInstallments, type FutureInstallmentGroup, type OrderRevenueData } from '../core/revenue-calculator';
import { REVENUE_PLAN_SELECT, toRevenueOrderData } from '../core/revenue-mapping';

/**
 * RENT orders still RESERVED that have a deposit plan, as calculator input (a stage can fall due in any period).
 * Fail-open: a failed query gives no orders (the additive `futureInstallments` is left out).
 */
export async function loadReservedPlanOrders(
  prisma: PrismaClient,
  outletFilter: Record<string, any>
): Promise<OrderRevenueData[]> {
  let rows: any[];
  try {
    rows = await prisma.order.findMany({
      where: {
        ...outletFilter,
        deletedAt: null,
        orderType: ORDER_TYPE.RENT as any,
        status: ORDER_STATUS.RESERVED as any,
        depositPlan: { not: Prisma.DbNull }
      } as any,
      select: {
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        pickupTotalAmount: true,
        createdAt: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        pickedUpAt: true,
        ...REVENUE_PLAN_SELECT
      },
      take: 5000
    } as any);
  } catch (error) {
    // additive field only: never fail a revenue screen because of it
    console.error('futureInstallments: could not load the RESERVED plan orders', error);
    return [];
  }
  return (rows as any[]).map((row) => toRevenueOrderData(row)).filter((order) => order.plan != null);
}

/** `{ futureInstallments }` for a period, or `{}` when no stage falls due in it */
export function futureInstallmentsField(
  orders: OrderRevenueData[],
  start: Date,
  end: Date
): { futureInstallments?: FutureInstallmentGroup[] } {
  const groups = getFutureInstallments(orders, start, end);
  return groups.length > 0 ? { futureInstallments: groups } : {};
}
