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
  /** Civil days (oldest first) for `newOrdersByDay`; omitted → empty series */
  trendDays?: { dateKey: string; start: Date; end: Date }[];
  /** Tomorrow's civil-day bounds for the "tomorrow" counts; omitted → `tomorrow: null` */
  tomorrowStart?: Date;
  tomorrowEnd?: Date;
}

async function listWithCount(where: any, orderBy: any) {
  const [orders, count] = await Promise.all([
    prisma.order.findMany({ where, select: orderRowSelect, orderBy, take: LIST_LIMIT }),
    prisma.order.count({ where }),
  ]);
  return { count, orders };
}

export async function getOutletOperations({ outletIds, start, end, soonEnd, includeCash, trendDays = [], tomorrowStart, tomorrowEnd }: OutletOperationsQuery) {
  const base = { orderType: 'RENT' as const, deletedAt: null, outletId: { in: outletIds } };

  const pickupsTodayWhere = { ...base, status: 'RESERVED' as const, pickupPlanAt: { gte: start, lte: end } };
  const returnsTodayWhere = { ...base, status: 'PICKUPED' as const, returnPlanAt: { gte: start, lte: end } };
  const overdueWhere = { ...base, status: 'PICKUPED' as const, returnPlanAt: { lt: start } };
  const noShowWhere = { ...base, status: 'RESERVED' as const, pickupPlanAt: { lt: start } };
  const returnsSoonWhere = { ...base, status: 'PICKUPED' as const, returnPlanAt: { gt: end, lte: soonEnd } };

  // Handovers and returns already done today: the "done" part of the progress bars
  const doneBase = { ...base, status: { not: 'CANCELLED' as const } };

  const hasTomorrow = Boolean(tomorrowStart && tomorrowEnd);
  const [pickupsToday, returnsToday, overdueReturns, noShows, returnsSoon, pickedUpToday, returnedToday, newOrderCounts, tomorrowCounts] =
    await Promise.all([
      listWithCount(pickupsTodayWhere, { pickupPlanAt: 'asc' }),
      listWithCount(returnsTodayWhere, { returnPlanAt: 'asc' }),
      listWithCount(overdueWhere, { returnPlanAt: 'asc' }),
      listWithCount(noShowWhere, { pickupPlanAt: 'asc' }),
      listWithCount(returnsSoonWhere, { returnPlanAt: 'asc' }),
      prisma.order.count({ where: { ...doneBase, pickedUpAt: { gte: start, lte: end } } }),
      prisma.order.count({ where: { ...doneBase, returnedAt: { gte: start, lte: end } } }),
      // New orders per civil day (all order types), indexed by (outletId, createdAt)
      Promise.all(
        trendDays.map((day) =>
          prisma.order.count({ where: { outletId: { in: outletIds }, deletedAt: null, createdAt: { gte: day.start, lte: day.end } } })
        )
      ),
      // Tomorrow's hand-overs and returns, to prepare at the end of the day
      hasTomorrow
        ? Promise.all([
            prisma.order.count({ where: { ...base, status: 'RESERVED' as const, pickupPlanAt: { gte: tomorrowStart, lte: tomorrowEnd } } }),
            prisma.order.count({ where: { ...base, status: 'PICKUPED' as const, returnPlanAt: { gte: tomorrowStart, lte: tomorrowEnd } } }),
          ])
        : Promise.resolve(null),
    ]);
  const tomorrow = tomorrowCounts ? { pickups: tomorrowCounts[0], returns: tomorrowCounts[1] } : null;

  const doneToday = { pickups: pickedUpToday, returns: returnedToday };
  const newOrdersByDay = trendDays.map((day, i) => ({ date: day.dateKey, count: newOrderCounts[i] }));

  if (!includeCash) {
    return { pickupsToday, returnsToday, overdueReturns, noShows, returnsSoon, doneToday, newOrdersByDay, tomorrow, cash: null };
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
    doneToday,
    newOrdersByDay,
    tomorrow,
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
