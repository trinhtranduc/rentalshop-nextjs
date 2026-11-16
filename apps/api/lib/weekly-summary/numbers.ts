import type { prisma as databasePrisma } from '@rentalshop/database';
import { ORDER_STATUS, ORDER_TYPE } from '@rentalshop/constants';
import { formatDateKeyInTimeZone, getUtcRangeForDateKeys } from '@rentalshop/utils';
import { buildAnalyticsPeriodReport, computePeriodByOutlet, percentChange } from '@rentalshop/utils/server';
import { daysOf, previousWeek, type WeekKeys } from './week';

/** #1612 a figure of the week with the week before */
export interface Change {
  current: number;
  previous: number;
  /** percent, `percentChange` of the analytics routes (previous 0 and current > 0 → 100) */
  growth: number;
}

export interface WeeklyNumbers {
  week: WeekKeys;
  previousWeek: WeekKeys;
  revenue: { orderValue: Change; collected: Change; outstanding: number; fees: number };
  /** Owner of a shop with two or more open branches; empty otherwise */
  branches: Array<{ outletId: number; name: string; orderValue: Change; collected: number; newOrders: number }>;
  orders: {
    /** Created in the week and not cancelled (Overview "Giá trị đơn mới" rule) */
    new: Change;
    rent: number;
    sale: number;
    /** Cancelled during the week */
    cancelled: number;
    byDay: Array<{ date: string; count: number }>;
  };
  rentals: {
    pickedUp: number;
    returned: number;
    /** Rentals due back in the week that came back on a later day or are still out */
    late: Change;
    /** Rentals to pick up in the week that are still booked (not picked up, not cancelled) */
    notPickedUp: number;
  };
  products: {
    /** Top 3 by order value of the week, cancelled orders excluded */
    hot: Array<{ productId: number; name: string; rentals: number; sales: number; revenue: number }>;
    /** Products of the scope with no line in an order of the week */
    notRented: number;
  };
  customers: {
    /** Customers with an order created in the week */
    total: number;
    /** Their first order in the scope is in the week */
    new: number;
    returning: number;
    /** Percent of the order value of the week (orders with a customer) from returning customers */
    returningShare: number;
  };
}

/** The client of `@rentalshop/database` (the routes pass it) */
export type Prisma = typeof databasePrisma;
type Db = Parameters<typeof buildAnalyticsPeriodReport>[1];

export interface WeeklyNumbersParams {
  week: WeekKeys;
  todayKey: string;
  timeZone: string;
  userRole: string;
  /** Same filter as the Overview routes (`resolveAnalyticsOutletFilter`) */
  outletFilter: Record<string, any>;
  /** Open branches to list (owner, two or more); null = no list */
  branchOutletIds: number[] | null;
  /** Products counted in `notRented`: the shop's, or those shown at one branch */
  productScope: { merchantId: number } | { outletId: number };
}

const change = (current: number, previous: number): Change => ({
  current,
  previous,
  growth: percentChange(current, previous)
});

/** Figures of one week for the summary. Cancelled orders are left out; days are civil days of `timeZone`. */
export async function computeWeeklyNumbers(prisma: Prisma, db: Db, params: WeeklyNumbersParams): Promise<WeeklyNumbers> {
  const { week, todayKey, timeZone, userRole, outletFilter, branchOutletIds, productScope } = params;
  const before = previousWeek(week);
  const range = getUtcRangeForDateKeys({ from: week.start, to: week.end }, timeZone);
  const prevRange = getUtcRangeForDateKeys({ from: before.start, to: before.end }, timeZone);
  const orderWhere = { ...outletFilter, deletedAt: null };
  const notCancelled = { not: ORDER_STATUS.CANCELLED as any };

  const lateIn = async (r: { start: Date; end: Date }): Promise<number> => {
    const due = await prisma.order.findMany({
      where: {
        ...orderWhere,
        orderType: ORDER_TYPE.RENT as any,
        status: { in: [ORDER_STATUS.PICKUPED, ORDER_STATUS.RETURNED] as any },
        returnPlanAt: { gte: r.start, lte: r.end }
      } as any,
      select: { returnPlanAt: true, returnedAt: true },
      take: 10000
    });
    return due.filter((o: any) => {
      const dueKey = formatDateKeyInTimeZone(new Date(o.returnPlanAt), timeZone);
      const backKey = o.returnedAt ? formatDateKeyInTimeZone(new Date(o.returnedAt), timeZone) : todayKey;
      return backKey > dueKey;
    }).length;
  };

  const [report, prevBranches, created, prevNew, late, prevLate, notPickedUp, lineProducts] = await Promise.all([
    // `as any`: @rentalshop/utils types its own copy of the Prisma client
    buildAnalyticsPeriodReport(prisma as any, db, {
      startDate: week.start,
      endDate: week.end,
      groupBy: 'day',
      limit: 3,
      outletFilter,
      userRole,
      timeZone,
      ...(branchOutletIds ? { byOutletIds: branchOutletIds } : {})
    }),
    branchOutletIds
      ? computePeriodByOutlet(prisma as any, {
          startDate: before.start,
          endDate: before.end,
          outletIds: branchOutletIds,
          timeZone
        })
      : Promise.resolve(null),
    prisma.order.findMany({
      where: { ...orderWhere, createdAt: { gte: range.start, lte: range.end }, status: notCancelled } as any,
      select: { createdAt: true, orderType: true, customerId: true, totalAmount: true },
      take: 10000
    }),
    prisma.order.count({
      where: { ...orderWhere, createdAt: { gte: prevRange.start, lte: prevRange.end }, status: notCancelled } as any
    }),
    lateIn(range),
    lateIn(prevRange),
    prisma.order.count({
      where: {
        ...orderWhere,
        orderType: ORDER_TYPE.RENT as any,
        status: ORDER_STATUS.RESERVED as any,
        pickupPlanAt: { gte: range.start, lte: range.end }
      } as any
    }),
    prisma.orderItem.findMany({
      where: {
        productId: { not: null },
        order: { ...orderWhere, createdAt: { gte: range.start, lte: range.end }, status: notCancelled }
      } as any,
      select: { productId: true },
      distinct: ['productId'] as any
    })
  ]);

  // Customers: new = first order in the scope falls in the week
  const customerIds = [...new Set(created.map((o: any) => o.customerId).filter((id: any) => typeof id === 'number'))];
  const firstOrders = customerIds.length
    ? await prisma.order.groupBy({
        by: ['customerId'],
        where: { ...orderWhere, customerId: { in: customerIds } } as any,
        _min: { createdAt: true }
      })
    : [];
  const newCustomers = new Set(
    (firstOrders as any[])
      .filter((row) => row._min?.createdAt && new Date(row._min.createdAt) >= range.start)
      .map((row) => row.customerId as number)
  );
  let withCustomerValue = 0;
  let returningValue = 0;
  for (const o of created as any[]) {
    if (typeof o.customerId !== 'number') continue;
    withCustomerValue += o.totalAmount || 0;
    if (!newCustomers.has(o.customerId)) returningValue += o.totalAmount || 0;
  }

  const rentedIds = (lineProducts as any[]).map((row) => row.productId).filter((id) => typeof id === 'number');
  const productWhere =
    'merchantId' in productScope
      ? { merchantId: productScope.merchantId, deletedAt: null }
      : { deletedAt: null, outletStock: { some: { outletId: productScope.outletId, isListed: true } } };
  const notRented = await prisma.product.count({
    where: { ...productWhere, ...(rentedIds.length ? { id: { notIn: rentedIds } } : {}) } as any
  });

  const perDay = new Map(daysOf(week).map((key) => [key, 0]));
  for (const o of created as any[]) {
    const key = formatDateKeyInTimeZone(new Date(o.createdAt), timeZone);
    if (perDay.has(key)) perDay.set(key, (perDay.get(key) || 0) + 1);
  }

  const prevByOutlet = new Map((prevBranches ?? []).map((row) => [row.outletId, row.orderValue]));
  const counts = report.operational?.orderCounts;
  const growth = report.growth;

  return {
    week,
    previousWeek: before,
    revenue: {
      orderValue: growth.orderValue
        ? change(growth.orderValue.current, growth.orderValue.previous)
        : change(report.revenue.totalOrderValue ?? 0, 0),
      collected: growth.collected
        ? change(growth.collected.current, growth.collected.previous)
        : change(report.revenue.collected ?? 0, 0),
      outstanding: report.revenue.outstanding ?? 0,
      fees: report.revenue.collectedBreakdown?.fees ?? 0
    },
    branches: (report.byOutlet ?? []).map((row) => ({
      outletId: row.outletId,
      name: row.outletName,
      orderValue: change(row.orderValue, prevByOutlet.get(row.outletId) ?? 0),
      collected: row.collected,
      newOrders: row.newOrders
    })),
    orders: {
      new: change(created.length, prevNew),
      rent: (created as any[]).filter((o) => o.orderType === ORDER_TYPE.RENT).length,
      sale: (created as any[]).filter((o) => o.orderType === ORDER_TYPE.SALE).length,
      cancelled: counts?.cancelled ?? 0,
      byDay: [...perDay.entries()].map(([date, count]) => ({ date, count }))
    },
    rentals: {
      pickedUp: counts?.pickup ?? 0,
      returned: counts?.return ?? 0,
      late: change(late, prevLate),
      notPickedUp
    },
    products: {
      hot: (report.topProducts ?? []).slice(0, 3).map((p: any) => ({
        productId: Number(p.id),
        name: String(p.name),
        rentals: Number(p.rentalCount) || 0,
        sales: Number(p.saleCount) || 0,
        revenue: Number(p.totalRevenue) || 0
      })),
      notRented
    },
    customers: {
      total: customerIds.length,
      new: newCustomers.size,
      returning: customerIds.length - newCustomers.size,
      returningShare: withCustomerValue > 0 ? Math.round((returningValue / withCustomerValue) * 100) : 0
    }
  };
}

/** Nothing happened in the week: no AI call */
export function weekHasActivity(n: WeeklyNumbers): boolean {
  return n.orders.new.current + n.orders.cancelled + n.rentals.pickedUp + n.rentals.returned > 0;
}
