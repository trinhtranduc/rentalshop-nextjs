import type { prisma as databasePrisma } from '@rentalshop/database';
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
/** Prisma input types of that client (the API also has a second generated copy; never mix the two) */
type OrderWhere = NonNullable<NonNullable<Parameters<Prisma['order']['findMany']>[0]>['where']>;
type ProductWhere = NonNullable<NonNullable<Parameters<Prisma['product']['count']>[0]>['where']>;
type Db = Parameters<typeof buildAnalyticsPeriodReport>[1];
/** @rentalshop/utils types its own copy of the Prisma client; same object at runtime */
type UtilsPrisma = Parameters<typeof buildAnalyticsPeriodReport>[0];

export interface WeeklyNumbersParams {
  week: WeekKeys;
  todayKey: string;
  timeZone: string;
  userRole: string;
  /** Same filter as the Overview routes (`resolveAnalyticsOutletFilter`) */
  outletFilter: OrderWhere;
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

interface TopProductRow {
  id?: unknown;
  name?: unknown;
  rentalCount?: unknown;
  saleCount?: unknown;
  totalRevenue?: unknown;
}

/** Figures of one week for the summary. Cancelled orders are left out; days are civil days of `timeZone`. */
export async function computeWeeklyNumbers(prisma: Prisma, db: Db, params: WeeklyNumbersParams): Promise<WeeklyNumbers> {
  const { week, todayKey, timeZone, userRole, outletFilter, branchOutletIds, productScope } = params;
  const before = previousWeek(week);
  const range = getUtcRangeForDateKeys({ from: week.start, to: week.end }, timeZone);
  const prevRange = getUtcRangeForDateKeys({ from: before.start, to: before.end }, timeZone);
  const orderWhere: OrderWhere = { ...outletFilter, deletedAt: null };
  const notCancelled = { not: 'CANCELLED' as const };
  const dayOf = (at: Date) => formatDateKeyInTimeZone(new Date(at), timeZone);

  const lateIn = async (r: { start: Date; end: Date }): Promise<number> => {
    const due = await prisma.order.findMany({
      where: {
        ...orderWhere,
        orderType: 'RENT',
        status: { in: ['PICKUPED', 'RETURNED'] },
        returnPlanAt: { gte: r.start, lte: r.end }
      },
      select: { returnPlanAt: true, returnedAt: true },
      take: 10000
    });
    return due.filter((o) => {
      if (!o.returnPlanAt) return false;
      const backKey = o.returnedAt ? dayOf(o.returnedAt) : todayKey;
      return backKey > dayOf(o.returnPlanAt);
    }).length;
  };

  const utilsPrisma = prisma as unknown as UtilsPrisma;
  const [report, prevBranches, created, prevNew, late, prevLate, notPickedUp, lineProducts] = await Promise.all([
    buildAnalyticsPeriodReport(utilsPrisma, db, {
      startDate: week.start,
      endDate: week.end,
      groupBy: 'day',
      limit: 3,
      outletFilter: outletFilter as Record<string, unknown>,
      userRole,
      timeZone,
      ...(branchOutletIds ? { byOutletIds: branchOutletIds } : {})
    }),
    branchOutletIds
      ? computePeriodByOutlet(utilsPrisma, {
          startDate: before.start,
          endDate: before.end,
          outletIds: branchOutletIds,
          timeZone
        })
      : Promise.resolve(null),
    prisma.order.findMany({
      where: { ...orderWhere, createdAt: { gte: range.start, lte: range.end }, status: notCancelled },
      select: { createdAt: true, orderType: true, customerId: true, totalAmount: true },
      take: 10000
    }),
    prisma.order.count({
      where: { ...orderWhere, createdAt: { gte: prevRange.start, lte: prevRange.end }, status: notCancelled }
    }),
    lateIn(range),
    lateIn(prevRange),
    prisma.order.count({
      where: { ...orderWhere, orderType: 'RENT', status: 'RESERVED', pickupPlanAt: { gte: range.start, lte: range.end } }
    }),
    prisma.orderItem.findMany({
      where: {
        productId: { not: null },
        order: { ...orderWhere, createdAt: { gte: range.start, lte: range.end }, status: notCancelled }
      },
      select: { productId: true },
      distinct: ['productId']
    })
  ]);

  // Customers: new = first order in the scope falls in the week
  const customerIds = [...new Set(created.map((o) => o.customerId).filter((id): id is number => typeof id === 'number'))];
  const firstOrders = customerIds.length
    ? await prisma.order.groupBy({
        by: ['customerId'],
        where: { ...orderWhere, customerId: { in: customerIds } },
        _min: { createdAt: true }
      })
    : [];
  const newCustomers = new Set(
    firstOrders
      .filter((row) => row._min?.createdAt && new Date(row._min.createdAt) >= range.start)
      .map((row) => row.customerId as number)
  );
  let withCustomerValue = 0;
  let returningValue = 0;
  for (const o of created) {
    if (typeof o.customerId !== 'number') continue;
    withCustomerValue += o.totalAmount || 0;
    if (!newCustomers.has(o.customerId)) returningValue += o.totalAmount || 0;
  }

  const rentedIds = lineProducts.map((row) => row.productId).filter((id): id is number => typeof id === 'number');
  const productWhere: ProductWhere =
    'merchantId' in productScope
      ? { merchantId: productScope.merchantId, deletedAt: null }
      : { deletedAt: null, outletStock: { some: { outletId: productScope.outletId, isListed: true } } };
  const notRented = await prisma.product.count({
    where: { ...productWhere, ...(rentedIds.length ? { id: { notIn: rentedIds } } : {}) }
  });

  const perDay = new Map(daysOf(week).map((key) => [key, 0]));
  for (const o of created) {
    const key = dayOf(o.createdAt);
    if (perDay.has(key)) perDay.set(key, (perDay.get(key) || 0) + 1);
  }

  const prevByOutlet = new Map((prevBranches ?? []).map((row) => [row.outletId, row.orderValue]));
  const counts = report.operational?.orderCounts;
  const growth = report.growth;
  const hot: TopProductRow[] = report.topProducts ?? [];

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
      rent: created.filter((o) => o.orderType === 'RENT').length,
      sale: created.filter((o) => o.orderType === 'SALE').length,
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
      hot: hot.slice(0, 3).map((p) => ({
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
