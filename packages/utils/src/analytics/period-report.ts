import type { PrismaClient } from '@prisma/client';
import { ORDER_STATUS, ORDER_TYPE, USER_ROLE } from '@rentalshop/constants';
import {
  calculatePeriodRevenueBatch,
  getOrderRevenueEvents,
  parseProductImages
} from '@rentalshop/utils';
import { withoutCollateral } from '../core/revenue-calculator';
import {
  computeIncomePeriodSummary,
  type IncomePeriodDayRow,
  type IncomePeriodSummary
} from './income-period-summary';
import { SHOP_TIMEZONE } from '../core/date';
import {
  addDaysToDateKey,
  getUtcRangeForDateKeys,
  listCivilDays,
  listCivilMonths,
  toDateKeyInTimeZone
} from '../core/date-range';
import { summarizeOrderValue, type OrderValueSummary } from './order-value';
import { paginateRanked, type RankingPage } from './ranking-page';
import { rankOutletsByRevenue, type TopOutletRank } from './top-outlet-rank';
import {
  aggregateProductShopSales,
  rankProductShops,
  type ProductRankSortBy
} from './top-product-rank';

export type { RankingPage, RankingSortBy } from './ranking-page';
export { paginateRanked, parseRankingQuery } from './ranking-page';
export type { TopOutletRank } from './top-outlet-rank';
export { rankOutletsByRevenue } from './top-outlet-rank';
export { summarizeOrderValue, type OrderValueSummary } from './order-value';
export type { ProductRankSortBy } from './top-product-rank';

const DAY_MS = 24 * 60 * 60 * 1000;

const revenueSelect = {
  orderType: true,
  status: true,
  totalAmount: true,
  depositAmount: true,
  securityDeposit: true,
  damageFee: true,
  lateFee: true,
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
  /** Orders created in the bucket, not cancelled (#484). Older apps ignore it. */
  newOrderCount?: number;
  /** `realIncome` without collateral (#484) */
  collected?: number;
}

export interface AnalyticsPeriodGrowth {
  orders: { current: number; previous: number; growth: number };
  revenue: { current: number; previous: number; growth: number };
  /** Same as `revenue`, without collateral (#484) */
  collected?: { current: number; previous: number; growth: number };
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
    /** Sum of `totalAmount` of orders created in the period, not cancelled (#484) */
    totalOrderValue?: number;
    /** Part of `totalOrderValue` not collected yet (#484) */
    outstanding?: number;
    /** Money collected in the period without collateral (#484) */
    collected?: number;
    /** Where `collected` came from: deposits + pickupAndSale + fees - refunds (#492) */
    collectedBreakdown?: { deposits: number; pickupAndSale: number; fees: number; refunds: number };
  };
  growth: AnalyticsPeriodGrowth;
  series: AnalyticsPeriodSeriesPoint[];
  topProducts: any[];
  topCustomers: any[];
  topOutlets: TopOutletRank[];
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

export async function computeTopOutletsRanking(
  prisma: PrismaClient,
  params: {
    outletFilter: Record<string, any>;
    rangeStart: Date;
    rangeEnd: Date;
    page?: number;
    limit?: number;
  }
): Promise<RankingPage<TopOutletRank>> {
  const { outletFilter, rangeStart, rangeEnd, page = 1, limit = 5 } = params;
  const grouped = await prisma.order.groupBy({
    by: ['outletId'],
    where: {
      ...outletFilter,
      deletedAt: null,
      status: { not: ORDER_STATUS.CANCELLED as any },
      createdAt: { gte: rangeStart, lte: rangeEnd }
    },
    _count: { _all: true },
    _sum: { totalAmount: true }
  });

  if (grouped.length === 0) {
    return paginateRanked<TopOutletRank>([], page, limit);
  }

  const rankedGroups = grouped
    .map((row) => ({
      outletId: row.outletId,
      orderCount: row._count._all,
      totalRevenue: row._sum.totalAmount || 0
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue || b.orderCount - a.orderCount);

  const pageSlice = paginateRanked(rankedGroups, page, limit);
  const outlets = await prisma.outlet.findMany({
    where: { id: { in: pageSlice.items.map((row) => row.outletId) } },
    select: {
      id: true,
      name: true,
      city: true,
      merchant: { select: { id: true, name: true } }
    }
  });

  return {
    ...pageSlice,
    items: rankOutletsByRevenue(pageSlice.items, outlets)
  };
}

export interface TopProductShopRank {
  id: number;
  name: string;
  rentPrice: number;
  category: string;
  note: string | null;
  rentalCount: number;
  saleCount: number;
  quantity: number;
  totalRevenue: number;
  image: string | null;
  outletId: number;
  outletName: string;
  merchantId: number;
  merchantName: string;
}

export async function computeTopProductsByShop(
  prisma: PrismaClient,
  params: {
    outletFilter: Record<string, any>;
    rangeStart: Date;
    rangeEnd: Date;
    sortBy?: ProductRankSortBy;
    page?: number;
    limit?: number;
  }
): Promise<RankingPage<TopProductShopRank>> {
  const { outletFilter, rangeStart, rangeEnd, sortBy = 'revenue', page = 1, limit = 5 } = params;
  const rows = await prisma.orderItem.findMany({
    where: {
      productId: { not: null },
      order: {
        ...outletFilter,
        deletedAt: null,
        status: { not: ORDER_STATUS.CANCELLED as any },
        createdAt: { gte: rangeStart, lte: rangeEnd }
      }
    },
    select: {
      productId: true,
      quantity: true,
      totalPrice: true,
      order: { select: { outletId: true, orderType: true } }
    }
  });

  // "rentals" = quantity on RENT lines, sales = quantity on SALE lines, per product and shop (#429)
  const quantityByType = new Map<string, { rent: number; sale: number }>();
  for (const row of rows) {
    if (!row.productId) continue;
    const key = `${row.productId}:${row.order.outletId}`;
    const entry = quantityByType.get(key) ?? { rent: 0, sale: 0 };
    if (row.order.orderType === ORDER_TYPE.RENT) entry.rent += row.quantity || 0;
    else if (row.order.orderType === ORDER_TYPE.SALE) entry.sale += row.quantity || 0;
    quantityByType.set(key, entry);
  }

  const ranked = rankProductShops(
    aggregateProductShopSales(
      rows.map((row) => ({
        productId: row.productId,
        quantity: row.quantity,
        totalPrice: row.totalPrice,
        outletId: row.order.outletId
      }))
    ),
    sortBy
  );

  const pageSlice = paginateRanked(ranked, page, limit);
  if (pageSlice.items.length === 0) {
    return paginateRanked<TopProductShopRank>([], page, limit);
  }

  const productIds = [...new Set(pageSlice.items.map((row) => row.productId))];
  const outletIds = [...new Set(pageSlice.items.map((row) => row.outletId))];

  const [products, outlets] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        rentPrice: true,
        description: true,
        images: true,
        category: { select: { name: true } },
        merchant: { select: { id: true, name: true } }
      }
    }),
    prisma.outlet.findMany({
      where: { id: { in: outletIds } },
      select: {
        id: true,
        name: true,
        merchant: { select: { id: true, name: true } }
      }
    })
  ]);

  const productById = new Map(products.map((product) => [product.id, product]));
  const outletById = new Map(outlets.map((outlet) => [outlet.id, outlet]));

  return {
    ...pageSlice,
    items: pageSlice.items.map((row) => {
      const product = productById.get(row.productId);
      const outlet = outletById.get(row.outletId);
      const images = parseProductImages(product?.images);
      const byType = quantityByType.get(`${row.productId}:${row.outletId}`);
      return {
        id: product?.id || row.productId,
        name: product?.name || 'Unknown Product',
        rentPrice: product?.rentPrice || 0,
        category: product?.category?.name || 'Uncategorized',
        note: product?.description || null,
        rentalCount: byType?.rent || 0,
        saleCount: byType?.sale || 0,
        quantity: row.quantity,
        totalRevenue: row.totalRevenue,
        image: images.length > 0 ? images[0] : null,
        outletId: outlet?.id || row.outletId,
        outletName: outlet?.name || 'Unknown Shop',
        merchantId: outlet?.merchant.id || product?.merchant.id || 0,
        merchantName: outlet?.merchant.name || product?.merchant.name || ''
      };
    })
  };
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
    topCustomers: [],
    topOutlets: []
  };
}

/**
 * Previous period with the same number of civil days (7d→prev 7d, 30d→prev 30d, full year→prev year).
 * Keys are `YYYY-MM-DD` civil days; the caller turns them into UTC bounds in its time zone (#355).
 */
export function resolvePreviousPeriodKeys(startKey: string, endKey: string): { prevStartKey: string; prevEndKey: string } {
  const isFullCalendarYear =
    startKey.slice(5) === '01-01' && endKey.slice(5) === '12-31' && startKey.slice(0, 4) === endKey.slice(0, 4);
  if (isFullCalendarYear) {
    const y = Number(startKey.slice(0, 4)) - 1;
    return { prevStartKey: `${y}-01-01`, prevEndKey: `${y}-12-31` };
  }
  const daySpan = Math.max(
    Math.round((Date.parse(`${endKey}T00:00:00Z`) - Date.parse(`${startKey}T00:00:00Z`)) / DAY_MS) + 1,
    1
  );
  const prevEndKey = addDaysToDateKey(startKey, -1);
  return { prevStartKey: addDaysToDateKey(prevEndKey, -(daySpan - 1)), prevEndKey };
}

/**
 * Percent change vs previous equal-length window.
 * Previous = 0 and current > 0 cannot divide; treat as +100% (new activity), not 0.
 * Previous > 0 and current = 0 is -100%. Both 0 stays 0.
 */
export function percentChange(current: number, previous: number): number {
  if (previous > 0) {
    return Math.round(((current - previous) / previous) * 10000) / 100;
  }
  if (current > 0) return 100;
  return 0;
}

function mapRevenueOrder(order: any) {
  return {
    orderType: order.orderType,
    status: order.status,
    totalAmount: order.totalAmount || 0,
    depositAmount: order.depositAmount || 0,
    securityDeposit: order.securityDeposit || 0,
    damageFee: order.damageFee || 0,
    lateFee: order.lateFee || 0,
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
  startKey: string,
  endKey: string,
  timeZone: string
): AnalyticsPeriodSeriesPoint[] {
  const byDate = new Map(periods.map((p) => [p.date, p]));
  return listCivilDays(startKey, endKey, timeZone).map(({ dateKey: key }) => {
    const [y, m, d] = key.split('-');
    const dateKey = `${y}/${m}/${d}`;
    const yearNum = parseInt(y, 10);
    const row = byDate.get(dateKey);
    return {
      month: `${d}/${m}/${y.slice(-2)}`,
      date: dateKey,
      dateISO: row?.dateISO ?? `${y}-${m}-${d}T00:00:00.000Z`,
      year: yearNum,
      dayNumber: parseInt(d, 10),
      realIncome: row?.totalRevenue ?? 0,
      collected: row?.collected ?? 0,
      futureIncome: 0,
      newOrderCount: row?.newOrderCount ?? 0,
      orderCount:
        (row?.newOrderCount ?? 0) +
        (row?.pickupOrderCount ?? 0) +
        (row?.returnOrderCount ?? 0) +
        (row?.cancelledOrderCount ?? 0)
    };
  });
}

export interface BuildAnalyticsPeriodReportParams {
  startDate: string;
  endDate: string;
  groupBy: 'day' | 'month';
  limit: number;
  outletFilter: Record<string, any>;
  userRole: string;
  /** IANA zone whose civil days and months the report uses (default Vietnam, #355) */
  timeZone?: string;
}

/**
 * Single duration-based analytics payload for mobile Overview (7d / 30d / year / custom).
 */
export async function buildAnalyticsPeriodReport(
  prisma: PrismaClient,
  db: DbApi,
  params: BuildAnalyticsPeriodReportParams
): Promise<AnalyticsPeriodReport> {
  const { startDate, endDate, groupBy, limit, outletFilter, userRole, timeZone = SHOP_TIMEZONE } = params;
  // Civil days of `timeZone` (#355): 2026-10-02 in Vietnam is 2026-10-01T17:00Z .. 2026-10-02T16:59:59.999Z
  const startKey = toDateKeyInTimeZone(startDate, timeZone);
  const endKey = toDateKeyInTimeZone(endDate, timeZone);
  if (!startKey || !endKey) throw new Error(`Invalid period: ${startDate}..${endDate}`);
  const { start: rangeStart, end: rangeEnd } = getUtcRangeForDateKeys({ from: startKey, to: endKey }, timeZone);
  const { prevStartKey, prevEndKey } = resolvePreviousPeriodKeys(startKey, endKey);
  const { start: prevStart, end: prevEnd } = getUtcRangeForDateKeys({ from: prevStartKey, to: prevEndKey }, timeZone);

  const computeOperational = async () => {
    const { summary } = await computeIncomePeriodSummary(prisma, {
      startDate,
      endDate,
      outletFilter,
      includeDailyPeriods: groupBy === 'day',
      timeZone
    });
    return summary;
  };

  const computeSeries = async (): Promise<AnalyticsPeriodSeriesPoint[]> => {
    if (groupBy === 'day') {
      const { periods } = await computeIncomePeriodSummary(prisma, {
        startDate,
        endDate,
        outletFilter,
        includeDailyPeriods: true,
        timeZone
      });
      return mapDayRowsToSeries(periods ?? [], startKey, endKey, timeZone);
    }

    const income: AnalyticsPeriodSeriesPoint[] = [];
    for (const civilMonth of listCivilMonths(startKey, endKey, timeZone)) {
      const year = civilMonth.year;
      const periodLabel = `${String(civilMonth.month).padStart(2, '0')}/${String(year).slice(-2)}`;
      const startOfMonth = civilMonth.start;
      const endOfMonth = civilMonth.end;

      const monthOrders = await prisma.order.findMany({
        where: buildEventWhere(outletFilter, startOfMonth, endOfMonth),
        select: revenueSelect,
        take: 10000
      });

      const monthRevenueOrders = monthOrders.map(mapRevenueOrder);
      const { realIncome, futureIncome } = calculatePeriodRevenueBatch(monthRevenueOrders, startOfMonth, endOfMonth);
      const { realIncome: collected } = calculatePeriodRevenueBatch(
        monthRevenueOrders.map(withoutCollateral),
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

      const newOrderCount = await db.orders.getStats({
        where: {
          ...outletFilter,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: { not: ORDER_STATUS.CANCELLED as any }
        }
      });

      income.push({
        month: periodLabel,
        year,
        monthNumber: civilMonth.month,
        realIncome,
        collected,
        futureIncome,
        orderCount,
        newOrderCount
      });
    }

    return income;
  };

  const computeGrowth = async (): Promise<AnalyticsPeriodGrowth> => {
    const fetchRevenue = async (ps: Date, pe: Date): Promise<{ revenue: number; collected: number }> => {
      const orders = await prisma.order.findMany({
        where: buildEventWhere(outletFilter, ps, pe),
        select: revenueSelect,
        take: 10000
      });
      const mapped = orders.map(mapRevenueOrder);
      const { realIncome } = calculatePeriodRevenueBatch(mapped, ps, pe);
      const { realIncome: collected } = calculatePeriodRevenueBatch(mapped.map(withoutCollateral), ps, pe);
      return { revenue: realIncome, collected };
    };

    const [curCountRes, prevCountRes, curRevenue, prevRevenue] = await Promise.all([
      db.orders.search({ where: { ...outletFilter, createdAt: { gte: rangeStart, lte: rangeEnd } }, limit: 1 }),
      db.orders.search({ where: { ...outletFilter, createdAt: { gte: prevStart, lte: prevEnd } }, limit: 1 }),
      fetchRevenue(rangeStart, rangeEnd),
      fetchRevenue(prevStart, prevEnd)
    ]);

    const curCount = curCountRes.total || 0;
    const prevCount = prevCountRes.total || 0;

    return {
      orders: {
        current: curCount,
        previous: prevCount,
        growth: percentChange(curCount, prevCount)
      },
      revenue: {
        current: curRevenue.revenue,
        previous: prevRevenue.revenue,
        growth: percentChange(curRevenue.revenue, prevRevenue.revenue)
      },
      collected: {
        current: curRevenue.collected,
        previous: prevRevenue.collected,
        growth: percentChange(curRevenue.collected, prevRevenue.collected)
      }
    };
  };

  const computeTopProducts = async () => {
    const orders = await db.orders.search({
      where: {
        ...outletFilter,
        createdAt: { gte: rangeStart, lte: rangeEnd },
        // Rankings never count cancelled orders (#361)
        status: { not: ORDER_STATUS.CANCELLED }
      },
      limit: 10000
    });
    const orderRows: Array<{ id: number; orderType?: string }> = orders.data || [];
    const orderIds = orderRows.map((o) => o.id);
    if (orderIds.length === 0) return [];

    const grouped = await db.orderItems.groupBy({
      by: ['productId'],
      where: { orderId: { in: orderIds }, productId: { not: null } },
      _count: { productId: true },
      _sum: { totalPrice: true },
      orderBy: { _sum: { totalPrice: 'desc' } },
      take: limit
    });

    // "rentals" count RENT order lines only; SALE lines are `saleCount` (#429)
    const rankedIds = grouped
      .map((item: { productId: number | null }) => Number(item.productId))
      .filter((id: number) => Number.isFinite(id) && id > 0);
    const countLinesByProduct = async (orderType: string): Promise<Map<number, number>> => {
      const typedOrderIds = orderRows.filter((o) => o.orderType === orderType).map((o) => o.id);
      if (typedOrderIds.length === 0 || rankedIds.length === 0) return new Map();
      const counts = await db.orderItems.groupBy({
        by: ['productId'],
        where: { orderId: { in: typedOrderIds }, productId: { in: rankedIds } },
        _count: { productId: true }
      });
      return new Map(
        counts.map((c: { productId: number | null; _count?: { productId?: number } }) => [
          Number(c.productId),
          Number(c._count?.productId) || 0
        ])
      );
    };
    const [rentLines, saleLines] = await Promise.all([
      countLinesByProduct(ORDER_TYPE.RENT),
      countLinesByProduct(ORDER_TYPE.SALE)
    ]);

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
        note: product?.description || null,
        rentalCount: rentLines.get(productId) || 0,
        saleCount: saleLines.get(productId) || 0,
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
        lateFee: true,
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

  const computeOrderValue = async (): Promise<OrderValueSummary> => {
    const created = await prisma.order.findMany({
      where: {
        ...outletFilter,
        deletedAt: null,
        createdAt: { gte: rangeStart, lte: rangeEnd },
        status: { not: ORDER_STATUS.CANCELLED as any }
      } as any,
      select: { orderType: true, status: true, totalAmount: true, depositAmount: true },
      take: 10000
    });
    return summarizeOrderValue(created);
  };

  const settled = await Promise.allSettled([
    computeOperational(),
    computeSeries(),
    computeGrowth(),
    computeTopProducts(),
    computeTopCustomers(),
    computeTopOutletsRanking(prisma, {
      outletFilter,
      rangeStart,
      rangeEnd,
      page: 1,
      limit
    }),
    computeOrderValue()
  ]);

  const valueOr = <T>(result: PromiseSettledResult<T>, fallback: T, label: string): T => {
    if (result.status === 'fulfilled') return result.value;
    console.error(`Analytics period section failed (${label}):`, result.reason);
    return fallback;
  };

  const operational = valueOr(settled[0], null, 'operational');
  const orderValue = valueOr<OrderValueSummary | null>(settled[6], null, 'orderValue');
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
      totalOrders: totalOrdersFromOps,
      ...(orderValue ? { totalOrderValue: orderValue.totalOrderValue, outstanding: orderValue.outstanding } : {}),
      ...(operational
        ? {
            collected: operational.totalCollected,
            collectedBreakdown: operational.collectedBreakdown
          }
        : {})
    },
    growth,
    series,
    topProducts: valueOr(settled[3], [], 'topProducts'),
    topCustomers: valueOr(settled[4], [], 'topCustomers'),
    topOutlets: valueOr(settled[5], paginateRanked([], 1, limit), 'topOutlets').items
  };
}
