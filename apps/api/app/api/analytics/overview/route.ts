import { NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import {
  handleApiError,
  ResponseBuilder,
  calculatePeriodRevenueBatch,
  getOrderRevenueEvents,
  parseProductImages
} from '@rentalshop/utils';
import { API, USER_ROLE, ORDER_STATUS, ORDER_TYPE } from '@rentalshop/constants';

/**
 * GET /api/analytics/overview - Aggregated payload for the mobile Overview (yearly) screen.
 *
 * Combines, in a single request, what the mobile app previously fetched via 5 separate
 * endpoints for the yearly report:
 *   - income          (monthly income series)      → /api/analytics/income?groupBy=month
 *   - growth          (orders/revenue vs previous)  → /api/analytics/growth-metrics
 *   - statistics      (status breakdown)            → /api/orders/statistics
 *   - topProducts     (top-performing products)     → /api/analytics/top-products
 *   - topCustomers    (top-performing customers)    → /api/analytics/top-customers
 *
 * IMPORTANT: This route is self-contained and mirrors the aggregated (no outlet-comparison)
 * logic of the source endpoints, reusing the same shared revenue utilities
 * (calculatePeriodRevenueBatch / getOrderRevenueEvents). The original endpoints are left
 * untouched so existing web/mobile consumers are unaffected.
 *
 * Authorization: requires full revenue analytics (analytics.view.revenue).
 * Query params: startDate, endDate (required, YYYY-MM-DD), limit (optional, top lists; default 3).
 */
export const GET = withPermissions(['analytics.view.revenue'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '3', 10);

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // ------------------------------------------------------------------
    // Resolve the outlet filter (CUID-based) once, role-scoped.
    // Mirrors growth-metrics/top-products/top-customers scoping so outlet
    // users are correctly restricted to their own outlet.
    // Returns null when the user has no data scope (should see nothing).
    // ------------------------------------------------------------------
    const buildOutletFilter = async (): Promise<Record<string, any> | null> => {
      if (user.role === USER_ROLE.MERCHANT && userScope.merchantId) {
        const merchant = await db.merchants.findById(userScope.merchantId);
        if (merchant && merchant.outlets) {
          return { outletId: { in: merchant.outlets.map((o: any) => o.id) } };
        }
        return {};
      }
      if (
        (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) &&
        userScope.outletId
      ) {
        const outlet = await db.outlets.findById(userScope.outletId);
        if (outlet) {
          return { outletId: outlet.id };
        }
        return {};
      }
      if (user.role === USER_ROLE.ADMIN) {
        return {}; // system-wide, no filter
      }
      return null; // no scope → no data
    };

    const outletFilter = await buildOutletFilter();

    // No accessible scope → return an empty but well-formed payload.
    if (outletFilter === null) {
      return NextResponse.json(
        ResponseBuilder.success('ANALYTICS_OVERVIEW_SUCCESS', {
          income: [],
          growth: {
            orders: { current: 0, previous: 0, growth: 0 },
            revenue: { current: 0, previous: 0, growth: 0 }
          },
          statistics: { totalOrders: 0, totalRevenue: 0, statusBreakdown: {} },
          topProducts: [],
          topCustomers: []
        })
      );
    }

    // Parse date range as UTC (align with income endpoint).
    const parseUTCStart = (s: string): Date => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      }
      const dt = new Date(s);
      return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0));
    };
    const parseUTCEnd = (s: string): Date => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const [y, m, d] = s.split('-').map(Number);
        return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
      }
      const dt = new Date(s);
      return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 23, 59, 59, 999));
    };

    const rangeStart = parseUTCStart(startDate);
    const rangeEnd = parseUTCEnd(endDate);

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

    const dayMs = 24 * 60 * 60 * 1000;

    // OR-based where clause capturing all orders with an event in the period.
    const buildEventWhere = (periodStart: Date, periodEnd: Date) => ({
      ...outletFilter,
      deletedAt: null,
      OR: [
        { createdAt: { gte: periodStart, lte: periodEnd } },
        { pickedUpAt: { gte: new Date(periodStart.getTime() - dayMs), lte: new Date(periodEnd.getTime() + dayMs), not: null } },
        { returnedAt: { gte: new Date(periodStart.getTime() - dayMs), lte: new Date(periodEnd.getTime() + dayMs), not: null } },
        { updatedAt: { gte: periodStart, lte: periodEnd }, status: ORDER_STATUS.CANCELLED as any },
        { pickupPlanAt: { gte: periodStart, lte: periodEnd, not: null } },
        { returnPlanAt: { gte: periodStart, lte: periodEnd, not: null } }
      ]
    });

    const mapRevenueOrder = (order: any) => ({
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
    });

    // ==================================================================
    // 1) INCOME (monthly) — mirror /api/analytics/income aggregated path.
    // ==================================================================
    const computeMonthlyIncome = async () => {
      const income: any[] = [];
      const startYear = rangeStart.getUTCFullYear();
      const startMonth = rangeStart.getUTCMonth();
      const endYear = rangeEnd.getUTCFullYear();
      const endMonth = rangeEnd.getUTCMonth();

      let current = new Date(Date.UTC(startYear, startMonth, 1, 0, 0, 0, 0));
      const endMonthDate = new Date(Date.UTC(endYear, endMonth, 1, 0, 0, 0, 0));

      while (current <= endMonthDate) {
        const year = current.getUTCFullYear();
        const month = current.getUTCMonth();
        const monthStr = String(month + 1).padStart(2, '0');
        const yearStr = String(year).slice(-2);
        const periodLabel = `${monthStr}/${yearStr}`;

        const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

        const monthOrders = await prisma.order.findMany({
          where: buildEventWhere(startOfMonth, endOfMonth),
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
            status: { in: [ORDER_STATUS.RESERVED as any, ORDER_STATUS.PICKUPED as any, ORDER_STATUS.COMPLETED as any] }
          }
        });

        income.push({
          month: periodLabel,
          year,
          realIncome,
          futureIncome,
          orderCount
        });

        current = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
      }
      return income;
    };

    // ==================================================================
    // 2) GROWTH — mirror /api/analytics/growth-metrics.
    // Count by createdAt; revenue over the OR-based event set.
    // Previous period = same range shifted one year back (year view) or
    // previous month (single-month view).
    // ==================================================================
    const computeGrowth = async () => {
      const start = new Date(startDate);
      const end = new Date(endDate);

      let prevStart: Date;
      let prevEnd: Date;
      if (start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear()) {
        // Same month → compare to previous month
        prevStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1, 0, 0, 0, 0));
        prevEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 0, 23, 59, 59, 999));
      } else {
        // Year/range view → compare to same range one year earlier
        prevStart = new Date(Date.UTC(rangeStart.getUTCFullYear() - 1, rangeStart.getUTCMonth(), rangeStart.getUTCDate(), 0, 0, 0, 0));
        prevEnd = new Date(Date.UTC(rangeEnd.getUTCFullYear() - 1, rangeEnd.getUTCMonth(), rangeEnd.getUTCDate(), 23, 59, 59, 999));
      }

      const [curCountRes, prevCountRes] = await Promise.all([
        db.orders.search({ where: { ...outletFilter, createdAt: { gte: rangeStart, lte: rangeEnd } }, limit: 1 }),
        db.orders.search({ where: { ...outletFilter, createdAt: { gte: prevStart, lte: prevEnd } }, limit: 1 })
      ]);
      const curCount = curCountRes.total || 0;
      const prevCount = prevCountRes.total || 0;

      const fetchRevenue = async (ps: Date, pe: Date): Promise<number> => {
        const orders = await prisma.order.findMany({ where: buildEventWhere(ps, pe), select: revenueSelect, take: 10000 });
        const { realIncome } = calculatePeriodRevenueBatch(orders.map(mapRevenueOrder), ps, pe);
        return realIncome;
      };

      const [curRevenue, prevRevenue] = await Promise.all([
        fetchRevenue(rangeStart, rangeEnd),
        fetchRevenue(prevStart, prevEnd)
      ]);

      const orderGrowth = prevCount > 0 ? ((curCount - prevCount) / prevCount) * 100 : 0;
      const revenueGrowth = prevRevenue > 0 ? ((curRevenue - prevRevenue) / prevRevenue) * 100 : 0;

      return {
        orders: { current: curCount, previous: prevCount, growth: Math.round(orderGrowth * 100) / 100 },
        revenue: { current: curRevenue, previous: prevRevenue, growth: Math.round(revenueGrowth * 100) / 100 }
      };
    };

    // ==================================================================
    // 3) STATISTICS — reuse the shared db.orders.getStatistics helper.
    // ==================================================================
    const computeStatistics = async () => {
      const stats = await db.orders.getStatistics({
        merchantId: userScope.merchantId,
        outletId:
          user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF
            ? userScope.outletId
            : undefined,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });
      return {
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        statusBreakdown: stats.statusBreakdown
      };
    };

    // ==================================================================
    // 4) TOP PRODUCTS — mirror /api/analytics/top-products.
    // ==================================================================
    const computeTopProducts = async () => {
      const orders = await db.orders.search({
        where: { ...outletFilter, createdAt: { gte: rangeStart, lte: rangeEnd } },
        limit: 10000
      });
      const orderIds = orders.data?.map((o: any) => o.id) || [];
      if (orderIds.length === 0) return [];

      // productId is nullable on OrderItem — exclude nulls or Prisma findUnique({ id: null })
      // throws and handleApiError maps some Prisma codes to BUSINESS_RULE_VIOLATION.
      const grouped = await db.orderItems.groupBy({
        by: ['productId'],
        where: {
          orderId: { in: orderIds },
          productId: { not: null }
        },
        _count: { productId: true },
        _sum: { totalPrice: true },
        orderBy: { _sum: { totalPrice: 'desc' } },
        take: limit
      });

      const result: any[] = [];
      for (const item of grouped) {
        const productId = typeof item.productId === 'number' ? item.productId : Number((item as any).productId);
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

    // ==================================================================
    // 5) TOP CUSTOMERS — mirror /api/analytics/top-customers.
    // ==================================================================
    const computeTopCustomers = async () => {
      const dateStart = new Date(startDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(endDate);
      dateEnd.setHours(23, 59, 59, 999);

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

      const customerMap = new Map<number, {
        customerId: number;
        orderCount: number;
        rentalCount: number;
        saleCount: number;
        totalRevenue: number;
      }>();

      for (const order of allOrders) {
        if (!order.customerId) continue;
        const orderData = mapRevenueOrder(order);
        const events = getOrderRevenueEvents(orderData, dateStart, dateEnd);

        const orderCreatedAt = order.createdAt ? new Date(order.createdAt) : null;
        const isCreatedInRange = !!orderCreatedAt && orderCreatedAt >= dateStart && orderCreatedAt <= dateEnd;

        if (events.length === 0) {
          if (order.orderType === ORDER_TYPE.SALE && isCreatedInRange) {
            const c = customerMap.get(order.customerId) || {
              customerId: order.customerId, orderCount: 0, rentalCount: 0, saleCount: 0, totalRevenue: 0
            };
            if (!customerMap.has(order.customerId)) customerMap.set(order.customerId, c);
            c.orderCount += 1;
            c.saleCount += 1;
            c.totalRevenue += order.totalAmount || 0;
          }
          continue;
        }

        if (!customerMap.has(order.customerId)) {
          customerMap.set(order.customerId, {
            customerId: order.customerId, orderCount: 0, rentalCount: 0, saleCount: 0, totalRevenue: 0
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
          name: customer ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() : 'Unknown Customer',
          email: customer?.email || '',
          phone: customer?.phone || '',
          location: customer?.address || '',
          orderCount: item.orderCount,
          rentalCount: item.rentalCount,
          saleCount: item.saleCount,
          totalSpent: user.role !== USER_ROLE.OUTLET_STAFF ? item.totalRevenue : null
        });
      }
      return result;
    };

    // Isolate section failures so one broken nested query (e.g. null productId)
    // does not turn the whole overview into BUSINESS_RULE_VIOLATION.
    const settled = await Promise.allSettled([
      computeMonthlyIncome(),
      computeGrowth(),
      computeStatistics(),
      computeTopProducts(),
      computeTopCustomers()
    ]);

    const valueOr = <T>(result: PromiseSettledResult<T>, fallback: T, label: string): T => {
      if (result.status === 'fulfilled') return result.value;
      console.error(`Analytics overview section failed (${label}):`, result.reason);
      return fallback;
    };

    return NextResponse.json(
      ResponseBuilder.success('ANALYTICS_OVERVIEW_SUCCESS', {
        income: valueOr(settled[0], [], 'income'),
        growth: valueOr(
          settled[1],
          {
            orders: { current: 0, previous: 0, growth: 0 },
            revenue: { current: 0, previous: 0, growth: 0 }
          },
          'growth'
        ),
        statistics: valueOr(
          settled[2],
          { totalOrders: 0, totalRevenue: 0, statusBreakdown: {} },
          'statistics'
        ),
        topProducts: valueOr(settled[3], [], 'topProducts'),
        topCustomers: valueOr(settled[4], [], 'topCustomers')
      })
    );
  } catch (error) {
    console.error('Error fetching analytics overview:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';
