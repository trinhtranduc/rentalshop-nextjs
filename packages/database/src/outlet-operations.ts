import { prisma } from './client';

/**
 * Data for the outlet operations panel (#350): today's handovers, returns, overdue rentals,
 * no-shows, and (managers only) deposit and fee totals.
 * `start`/`end` are the UTC bounds of the Vietnam civil day; every filter runs in SQL.
 */

const LIST_LIMIT = 50;

const orderRowSelect = {
  id: true,
  orderNumber: true,
  pickupPlanAt: true,
  returnPlanAt: true,
  totalAmount: true,
  depositAmount: true,
  securityDeposit: true,
  isReadyToDeliver: true,
  customer: { select: { firstName: true, lastName: true, phone: true } },
  orderItems: { select: { quantity: true, product: { select: { name: true } } } },
} as const;

export interface OutletOperationsQuery {
  outletIds: number[];
  start: Date;
  end: Date;
  /** End of the look-ahead window for `returnsSoon` (end of today + 3 civil days) */
  soonEnd: Date;
  includeCash: boolean;
}

async function listWithCount(where: any, orderBy: any) {
  const [orders, count] = await Promise.all([
    prisma.order.findMany({ where, select: orderRowSelect, orderBy, take: LIST_LIMIT }),
    prisma.order.count({ where }),
  ]);
  return { count, orders };
}

export async function getOutletOperations({ outletIds, start, end, soonEnd, includeCash }: OutletOperationsQuery) {
  const base = { orderType: 'RENT' as const, deletedAt: null, outletId: { in: outletIds } };

  const pickupsTodayWhere = { ...base, status: 'RESERVED' as const, pickupPlanAt: { gte: start, lte: end } };
  const returnsTodayWhere = { ...base, status: 'PICKUPED' as const, returnPlanAt: { gte: start, lte: end } };
  const overdueWhere = { ...base, status: 'PICKUPED' as const, returnPlanAt: { lt: start } };
  const noShowWhere = { ...base, status: 'RESERVED' as const, pickupPlanAt: { lt: start } };
  const returnsSoonWhere = { ...base, status: 'PICKUPED' as const, returnPlanAt: { gt: end, lte: soonEnd } };

  const [pickupsToday, returnsToday, overdueReturns, noShows, returnsSoon] = await Promise.all([
    listWithCount(pickupsTodayWhere, { pickupPlanAt: 'asc' }),
    listWithCount(returnsTodayWhere, { returnPlanAt: 'asc' }),
    listWithCount(overdueWhere, { returnPlanAt: 'asc' }),
    listWithCount(noShowWhere, { pickupPlanAt: 'asc' }),
    listWithCount(returnsSoonWhere, { returnPlanAt: 'asc' }),
  ]);

  if (!includeCash) {
    return { pickupsToday, returnsToday, overdueReturns, noShows, returnsSoon, cash: null };
  }

  const depositSum = { depositAmount: true, securityDeposit: true } as const;
  const [held, dueToday, fees] = await Promise.all([
    prisma.order.aggregate({
      where: { ...base, status: 'PICKUPED' },
      _sum: depositSum,
      _count: { _all: true },
    }),
    prisma.order.aggregate({ where: returnsTodayWhere, _sum: depositSum, _count: { _all: true } }),
    prisma.order.aggregate({
      where: { outletId: { in: outletIds }, deletedAt: null, status: { not: 'CANCELLED' }, returnedAt: { gte: start, lte: end } },
      _sum: { lateFee: true, damageFee: true },
      _count: { _all: true },
    }),
  ]);

  return {
    pickupsToday,
    returnsToday,
    overdueReturns,
    noShows,
    returnsSoon,
    cash: {
      depositsHeld: {
        depositAmount: held._sum.depositAmount ?? 0,
        securityDeposit: held._sum.securityDeposit ?? 0,
        orders: held._count._all,
      },
      depositsDueToday: {
        depositAmount: dueToday._sum.depositAmount ?? 0,
        securityDeposit: dueToday._sum.securityDeposit ?? 0,
        orders: dueToday._count._all,
      },
      feesToday: {
        lateFee: fees._sum.lateFee ?? 0,
        damageFee: fees._sum.damageFee ?? 0,
        orders: fees._count._all,
      },
    },
  };
}

export async function getMerchantOutletIds(merchantId: number): Promise<number[]> {
  const outlets = await prisma.outlet.findMany({ where: { merchantId }, select: { id: true } });
  return outlets.map((outlet: { id: number }) => outlet.id);
}

export const outletOperations = {
  get: getOutletOperations,
  merchantOutletIds: getMerchantOutletIds,
};
