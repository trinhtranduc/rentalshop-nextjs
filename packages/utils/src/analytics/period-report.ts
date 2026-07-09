import type { PrismaClient } from '@prisma/client';
import { ORDER_STATUS, ORDER_TYPE, USER_ROLE } from '@rentalshop/constants';
import {
  calculatePeriodRevenueBatch,
  getOrderRevenueEvents,
  parseProductImages
} from '@rentalshop/utils';
import {
  computeIncomePeriodSummary,
  type IncomePeriodDayRow,
  type IncomePeriodSummary
} from './income-period-summary';
import { getUTCDateKey } from '../core/date';

const DAY_MS = 24 * 60 * 60 * 1000;

const revenueSelect = {
  orderType: true,
  status: true,
  totalAmount: true,
  depositAmount: true,
  securityDeposit: true,
  damageFee: true,
  createdAt: true,
  pickedUpAt: true,
  returnedAt: true,
  pickupPlanAt: true,
  returnPlanAt: true,
  updatedAt: true
} as const;

export interface AnalyticsPeriodSeriesPoint {
  month?: string;
  date?: string;
  dateISO?: string;
  year?: number;
  monthNumber?: number;
  dayNumber?: number;
  realIncome: number;
  futureIncome: number;
  orderCount: number;
}

export interface AnalyticsPeriodGrowth {
  orders: { current: number; previous: number; growth: number };
  revenue: { current: number; previous: number; growth: number };
}

export interface AnalyticsPeriodReport {
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'month';
  operational: IncomePeriodSummary | null;
  revenue: {
    totalRevenue: number;
    totalActualRevenue: number;
    totalOrders: number;
  };
  growth: AnalyticsPeriodGrowth;
  series: AnalyticsPeriodSeriesPoint[];
  topProducts: any[];
  topCustomers: any[];
}

type DbApi = {
  merchants: { findById: (id: number) => Promise<any> };
  outlets: { findById: (id: number) => Promise<any> };
  orders: {
    search: (args: any) => Promise<{ total?: number; data?: any[] }>;
    getStats: (args: any) => Promise<number>;
  };
  orderItems: { groupBy: (args: any) => Promise<any[]> };
  products: { findById: (id: number) => Promise<any> };
  customers: { findById: (id: number) => Promise<any> };
};

export async function resolveAnalyticsOutletFilter(
  db: DbApi,
  user: { role: string },
  userScope: { merchantId?: number; outletId?: number }
): Promise<Record<string, any> | null> {
  if (user.role === USER_ROLE.MERCHANT && userScope.merchantId) {
    const merchant = await db.merchants.findById(userScope.merchantId);
    if (merchant?.outlets) {
      return { outletId: { in: merchant.outlets.map((o: { id: number }) => o.id) } };
    }
    return {};
  }
  if (
    (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) &&
    userScope.outletId
  ) {
    const outlet = await db.outlets.findById(userScope.outletId);
    if (outlet) return { outletId: outlet.id };
    return {};
  }
  if (user.role === USER_ROLE.ADMIN) return {};
  return null;
}

export function emptyAnalyticsPeriodReport(
  startDate: string,
  endDate: string,
  groupBy: 'day' | 'month'
): AnalyticsPeriodReport {
  const zeroGrowth = {
    orders: { current: 0, previous: 0, growth: 0 },
    revenue: { current: 0, previous: 0, growth: 0 }
  };
  return {
    startDate,
    endDate,
    groupBy,
    operational: null,
    revenue: { totalRevenue: 0, totalActualRevenue: 0, totalOrders: 0 },
    growth: zeroGrowth,
    series: [],
    topProducts: [],
    topCustomers: []
  };
}

function parseUTCStart(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }
  const dt = new Date(s);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0));
}

function parseUTCEnd(s: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  }
  const dt = new Date(s);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 23, 59, 59, 999));
}

/** Previous period with the same number of calendar days (7d→prev 7d, 30d→prev 30d, year→prev year). */
export function resolvePreviousPeriod(rangeStart: Date, rangeEnd: Date): { prevStart: Date; prevEnd: Date } {
  const isFullCalendarYear =
    rangeStart.getUTCMonth() === 0 &&
    rangeStart.getUTCDate() === 1 &&
    rangeEnd.getUTCMonth() === 11 &&
    rangeEnd.getUTCDate() === 31 &&
    rangeStart.getUTCFullYear() === rangeEnd.getUTCFullYear();

  if (isFullCalendarYear) {
    const y = rangeStart.getUTCFullYear() - 1;
    return {
      prevStart: new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0)),
      prevEnd: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999))
    };
  }

  const startDay = Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate());
  const endDay = Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), rangeEnd.getUTCDate());
  const daySpan = Math.max(Math.round((endDay - startDay) / DAY_MS) + 1, 1);

  const prevEndDay = new Date(startDay - DAY_MS);
  const prevStartDay = new Date(prevEndDay.getTime() - (daySpan - 1) * DAY_MS);

  return {
    prevStart: new Date(
      Date.UTC(prevStartDay.getUTCFullYear(), prevStartDay.getUTCMonth(), prevStartDay.getUTCDate(), 0, 0, 0, 0)
    ),
    prevEnd: new Date(
      Date.UTC(prevEndDay.getUTCFullYear(), prevEndDay.getUTCMonth(), prevEndDay.getUTCDate(), 23, 59, 59, 999)
    )
  };
}

function mapRevenueOrder(order: any) {
  return {
    orderType: order.orderType,
    status: order.status,
    totalAmount: order.totalAmount || 0,
    depositAmount: order.depositAmount || 0,
    securityDeposit: order.securityDeposit || 0,
    damageFee: order.damageFee || 0,
    createdAt: order.createdAt,
    pickedUpAt: order.pickedUpAt,
    returnedAt: order.returnedAt,
    pickupPlanAt: order.pickupPlanAt,
    returnPlanAt: order.returnPlanAt,
    updatedAt: order.updatedAt
  };
}

function buildEventWhere(
  outletFilter: Record<string, any>,
  periodStart: Date,
  periodEnd: Date
) {
  return {
    ...outletFilter,
    deletedAt: null,
    OR: [
      { createdAt: { gte: periodStart, lte: periodEnd } },
      {
        pickedUpAt: {
          gte: new Date(periodStart.getTime() - DAY_MS),
          lte: new Date(periodEnd.getTime() + DAY_MS),
          not: null
        }
      },
      {
        returnedAt: {
          gte: new Date(periodStart.getTime() - DAY_MS),
          lte: new Date(periodEnd.getTime() + DAY_MS),
          not: null
        }
      },
      { updatedAt: { gte: periodStart, lte: periodEnd }, status: ORDER_STATUS.CANCELLED as any },
      { pickupPlanAt: { gte: periodStart, lte: periodEnd, not: null } },
      { returnPlanAt: { gte: periodStart, lte: periodEnd, not: null } }
    ]
  };
}

function mapDayRowsToSeries(
  periods: IncomePeriodDayRow[],
  rangeStart: Date,
  rangeEnd: Date
): AnalyticsPeriodSeriesPoint[] {
  const byDate = new Map(periods.map((p) => [p.date, p]));
  const series: AnalyticsPeriodSeriesPoint[] = [];

  let currentMs = Date.UTC(
    rangeStart.getUTCFullYear(),
    rangeStart.getUTCMonth(),
    rangeStart.getUTCDate()
  );
  const endMs = Date.UTC(
    rangeEnd.getUTCFullYear(),
    rangeEnd.getUTCMonth(),
    rangeEnd.getUTCDate()
  );

  while (currentMs <= endMs) {
    const current = new Date(currentMs);
    const dateKey = getUTCDateKey(current);
    const [y, m, d] = dateKey.split('/');
    const yearNum = parseInt(y, 10);
    const monthNum = parseInt(m, 10);
    const dayNum = parseInt(d, 10);
    const row = byDate.get(dateKey);

    series.push({
      month: `${String(dayNum).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/${String(yearNum).slice(-2)}`,
      date: dateKey,
      dateISO: row?.dateISO ?? `${y}-${m}-${d}T00:00:00.000Z`,
      year: yearNum,
      dayNumber: dayNum,
      realIncome: row?.totalRevenue ?? 0,
      futureIncome: 0,
      orderCount:
        (row?.newOrderCount ?? 0) +
        (row?.pickupOrderCount ?? 0) +
        (row?.returnOrderCount ?? 0) +
        (row?.cancelledOrderCount ?? 0)
    });

    currentMs += DAY_MS;
  }

  return series;
}

export interface BuildAnalyticsPeriodReportParams {
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'month';
  limit: number;
  outletFilter: Record<string, any>;
  userRole: string;
}

/**
 * Single duration-based analytics payload for mobile Overview (7d / 30d / year / custom).
 */
export async function buildAnalyticsPeriodReport(
  prisma: PrismaClient,
  db: DbApi,
  params: BuildAnalyticsPeriodReportParams
): Promise<AnalyticsPeriodReport> {
  const { startDate, endDate, groupBy, limit, outletFilter, userRole } = params;
  const rangeStart = parseUTCStart(startDate);
  const rangeEnd = parseUTCEnd(endDate);
  const { prevStart, prevEnd } = resolvePreviousPeriod(rangeStart, rangeEnd);

  const computeOperational = async () => {
    const { summary } = await computeIncomePeriodSummary(prisma, {
      startDate,
      endDate,
      outletFilter,
      includeDailyPeriods: groupBy === 'day'
    });
    return summary;
  };

  const computeSeries = async (): Promise<AnalyticsPeriodSeriesPoint[]> => {
    if (groupBy === 'day') {
      const { periods } = await computeIncomePeriodSummary(prisma, {
        startDate,
        endDate,
        outletFilter,
        includeDailyPeriods: true
      });
      return mapDayRowsToSeries(periods ?? [], rangeStart, rangeEnd);
    }

    const income: AnalyticsPeriodSeriesPoint[] = [];
    let current = new Date(
      Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), 1, 0, 0, 0, 0)
    );
    const endMonthDate = new Date(
      Date.UTC(rangeEnd.getUTCFullYear(), rangeEnd.getUTCMonth(), 1, 0, 0, 0, 0)
    );

    while (current <= endMonthDate) {
      const year = current.getUTCFullYear();
      const month = current.getUTCMonth();
      const monthStr = String(month + 1).padStart(2, '0');
      const yearStr = String(year).slice(-2);
      const periodLabel = `${monthStr}/${yearStr}`;
      const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

      const monthOrders = await prisma.order.findMany({
        where: buildEventWhere(outletFilter, startOfMonth, endOfMonth),
        select: revenueSelect,
        take: 10000
      });

      const { realIncome, futureIncome } = calculatePeriodRevenueBatch(
        monthOrders.map(mapRevenueOrder),
        startOfMonth,
        endOfMonth
      );

      const orderCount = await db.orders.getStats({
        where: {
          ...outletFilter,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: {
            in: [ORDER_STATUS.RESERVED as any, ORDER_STATUS.PICKUPED as any, ORDER_STATUS.COMPLETED as any]
          }
        }
      });

      income.push({
        month: periodLabel,
        year,
        monthNumber: month + 1,
        realIncome,
        futureIncome,
        orderCount
      });

      current = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
    }

    return income;
  };

  const computeGrowth = async (): Promise<AnalyticsPeriodGrowth> => {
    const fetchRevenue = async (ps: Date, pe: Date): Promise<number> => {
      const orders = await prisma.order.findMany({
        where: buildEventWhere(outletFilter, ps, pe),
        select: revenueSelect,
        take: 10000
      });
      const { realIncome } = calculatePeriodRevenueBatch(orders.map(mapRevenueOrder), ps, pe);
      return realIncome;
    };

    const [curCountRes, prevCountRes, curRevenue, prevRevenue] = await Promise.all([
      db.orders.search({ where: { ...outletFilter, createdAt: { gte: rangeStart, lte: rangeEnd } }, limit: 1 }),
      db.orders.search({ where: { ...outletFilter, createdAt: { gte: prevStart, lte: prevEnd } }, limit: 1 }),
      fetchRevenue(rangeStart, rangeEnd),
      fetchRevenue(prevStart, prevEnd)
    ]);

    const curCount = curCountRes.total || 0;
    const prevCount = prevCountRes.total || 0;
    const orderGrowth = prevCount > 0 ? ((curCount - prevCount) / prevCount) * 100 : 0;
    const revenueGrowth = prevRevenue > 0 ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return {
      orders: { current: curCount, previous: prevCount, growth: Math.round(orderGrowth * 100) / 100 },
      revenue: { current: curRevenue, previous: prevRevenue, growth: Math.round(revenueGrowth * 100) / 100 }
    };
  };

  const computeTopProducts = async () => {
    const orders = await db.orders.search({
      where: { ...outletFilter, createdAt: { gte: rangeStart, lte: rangeEnd } },
      limit: 10000
    });
    const orderIds = orders.data?.map((o: { id: number }) => o.id) || [];
    if (orderIds.length === 0) return [];

    const grouped = await db.orderItems.groupBy({
      by: ['productId'],
      where: { orderId: { in: orderIds }, productId: { not: null } },
      _count: { productId: true },
      _sum: { totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: limit
    });

    const result: any[] = [];
    for (const item of grouped) {
      const productId =
        typeof item.productId === 'number' ? item.productId : Number((item as any).productId);
      if (!Number.isFinite(productId) || productId <= 0) continue;
      const product = await db.products.findById(productId);
      const images = parseProductImages(product?.images);
      result.push({
        id: product?.id || productId,
        name: product?.name || 'Unknown Product',
        rentPrice: product?.rentPrice || 0,
        category: product?.category?.name || 'Uncategorized',
        rentalCount: (item._count as any).productId,
        totalRevenue: item._sum?.totalPrice || 0,
        image: images.length > 0 ? images[0] : null
      });
    }
    return result;
  };

  const computeTopCustomers = async () => {
    const allOrders = await prisma.order.findMany({
      where: {
        ...outletFilter,
        customerId: { not: null },
        status: { not: ORDER_STATUS.CANCELLED as any },
        deletedAt: null
      },
      select: {
        id: true,
        customerId: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        securityDeposit: true,
        damageFee: true,
        createdAt: true,
        pickedUpAt: true,
        returnedAt: true,
        updatedAt: true,
        pickupPlanAt: true,
        returnPlanAt: true
      },
      take: 10000
    });

    const customerMap = new Map<
      number,
      { customerId: number; orderCount: number; rentalCount: number; saleCount: number; totalRevenue: number }
    >();

    for (const order of allOrders) {
      if (!order.customerId) continue;
      const orderData = mapRevenueOrder(order);
      const events = getOrderRevenueEvents(orderData, rangeStart, rangeEnd);
      const orderCreatedAt = order.createdAt ? new Date(order.createdAt) : null;
      const isCreatedInRange =
        !!orderCreatedAt && orderCreatedAt >= rangeStart && orderCreatedAt <= rangeEnd;

      if (events.length === 0) {
        if (order.orderType === ORDER_TYPE.SALE && isCreatedInRange) {
          const c =
            customerMap.get(order.customerId) ||
            { customerId: order.customerId, orderCount: 0, rentalCount: 0, saleCount: 0, totalRevenue: 0 };
          if (!customerMap.has(order.customerId)) customerMap.set(order.customerId, c);
          c.orderCount += 1;
          c.saleCount += 1;
          c.totalRevenue += order.totalAmount || 0;
        }
        continue;
      }

      if (!customerMap.has(order.customerId)) {
        customerMap.set(order.customerId, {
          customerId: order.customerId,
          orderCount: 0,
          rentalCount: 0,
          saleCount: 0,
          totalRevenue: 0
        });
      }
      const c = customerMap.get(order.customerId)!;
      c.orderCount += 1;
      if (order.orderType === ORDER_TYPE.RENT) c.rentalCount += 1;
      else if (order.orderType === ORDER_TYPE.SALE) c.saleCount += 1;
      c.totalRevenue += events.reduce((sum, e) => sum + e.revenue, 0);
    }

    const top = Array.from(customerMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit);

    const result: any[] = [];
    for (const item of top) {
      if (!Number.isFinite(item.customerId) || item.customerId <= 0) continue;
      const customer = await db.customers.findById(item.customerId);
      result.push({
        id: customer?.id || item.customerId,
        name: customer
          ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim()
          : 'Unknown Customer',
        email: customer?.email || '',
        phone: customer?.phone || '',
        location: customer?.address || '',
        orderCount: item.orderCount,
        rentalCount: item.rentalCount,
        saleCount: item.saleCount,
        totalSpent: userRole !== USER_ROLE.OUTLET_STAFF ? item.totalRevenue : null
      });
    }
    return result;
  };

  const settled = await Promise.allSettled([
    computeOperational(),
    computeSeries(),
    computeGrowth(),
    computeTopProducts(),
    computeTopCustomers()
  ]);

  const valueOr = <T>(result: PromiseSettledResult<T>, fallback: T, label: string): T => {
    if (result.status === 'fulfilled') return result.value;
    console.error(`Analytics period section failed (${label}):`, result.reason);
    return fallback;
  };

  const operational = valueOr(settled[0], null, 'operational');
  const series = valueOr(settled[1], [], 'series');
  const growth = valueOr(
    settled[2],
    {
      orders: { current: 0, previous: 0, growth: 0 },
      revenue: { current: 0, previous: 0, growth: 0 }
    },
    'growth'
  );

  const totalOrdersFromOps =
    operational?.orderCounts != null
      ? operational.orderCounts.new +
        operational.orderCounts.pickup +
        operational.orderCounts.return +
        operational.orderCounts.cancelled
      : growth.orders.current;

  return {
    startDate,
    endDate,
    groupBy,
    operational,
    revenue: {
      totalRevenue: operational?.totalRevenue ?? growth.revenue.current,
      totalActualRevenue: operational?.totalActualRevenue ?? growth.revenue.current,
      totalOrders: totalOrdersFromOps
    },
    growth,
    series,
    topProducts: valueOr(settled[3], [], 'topProducts'),
    topCustomers: valueOr(settled[4], [], 'topCustomers')
  };
}
