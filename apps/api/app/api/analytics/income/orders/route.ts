import { NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
import { ORDER_STATUS, ORDER_TYPE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, normalizeDateToISO, getUTCDateKey, getOrderRevenueEvents } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

const STATUS_VALUES = ['new', 'pickup', 'return', 'all'] as const;
type StatusFilter = (typeof STATUS_VALUES)[number];

const EVENT_TYPES_NEW = ['RENT_DEPOSIT', 'SALE'];
const EVENT_TYPES_PICKUP = ['RENT_PICKUP'];
const EVENT_TYPES_RETURN = ['RENT_RETURN'];

function buildOrdersWhereClause(
  status: StatusFilter,
  queryStart: Date,
  queryEnd: Date
): any {
  const base = { deletedAt: null };
  if (status === 'all') {
    return {
      ...base,
      OR: [
        { createdAt: { gte: queryStart, lte: queryEnd } },
        { pickedUpAt: { gte: queryStart, lte: queryEnd, not: null } },
        { returnedAt: { gte: queryStart, lte: queryEnd, not: null } },
        { AND: [{ status: ORDER_STATUS.CANCELLED }, { updatedAt: { gte: queryStart, lte: queryEnd } }] },
        { AND: [{ orderType: ORDER_TYPE.SALE }, { status: ORDER_STATUS.COMPLETED }, { updatedAt: { gte: queryStart, lte: queryEnd } }] }
      ]
    };
  }
  if (status === 'new') {
    return { ...base, createdAt: { gte: queryStart, lte: queryEnd } };
  }
  if (status === 'pickup') {
    return { ...base, pickedUpAt: { gte: queryStart, lte: queryEnd, not: null } };
  }
  return { ...base, returnedAt: { gte: queryStart, lte: queryEnd, not: null } };
}

function filterEventsByStatus<T extends { revenueType: string }>(events: T[], status: StatusFilter): T[] {
  if (status === 'all') return events;
  if (status === 'new') return events.filter((e) => EVENT_TYPES_NEW.includes(e.revenueType));
  if (status === 'pickup') return events.filter((e) => EVENT_TYPES_PICKUP.includes(e.revenueType));
  return events.filter((e) => EVENT_TYPES_RETURN.includes(e.revenueType));
}

/**
 * GET /api/analytics/income/orders
 * List order theo kỳ (startDate–endDate), filter status (new|pickup|return|all), plan (default true), pagination (limit, offset).
 */
export const GET = withPermissions(['analytics.view.revenue', 'analytics.view.revenue.daily'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const statusParam = (searchParams.get('status') ?? 'all').toLowerCase();
    const status = STATUS_VALUES.includes(statusParam as StatusFilter) ? (statusParam as StatusFilter) : 'all';
    const planParam = (searchParams.get('plan') ?? 'true').toLowerCase();
    const plan = !['false', '0'].includes(planParam);
    const limitRaw = searchParams.get('limit');
    const offsetRaw = searchParams.get('offset');
    const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;
    const offset = offsetRaw ? parseInt(offsetRaw, 10) : 0;

    if (!startDate || !endDate) {
      return NextResponse.json(ResponseBuilder.error('MISSING_REQUIRED_FIELD'), { status: API.STATUS.BAD_REQUEST });
    }
    if (status !== 'all' && !STATUS_VALUES.includes(status)) {
      return NextResponse.json(ResponseBuilder.error('INVALID_STATUS'), { status: API.STATUS.BAD_REQUEST });
    }
    if (limit !== undefined && (isNaN(limit) || limit < 1)) {
      return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: API.STATUS.BAD_REQUEST });
    }
    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: API.STATUS.BAD_REQUEST });
    }

    const startOfDayUTC = new Date(startDate + 'T00:00:00.000Z');
    const endOfDayUTC = new Date(endDate + 'T23:59:59.999Z');
    const previousDayStartUTC = new Date(startOfDayUTC);
    previousDayStartUTC.setUTCDate(previousDayStartUTC.getUTCDate() - 1);
    const nextDayEndUTC = new Date(endOfDayUTC);
    nextDayEndUTC.setUTCDate(nextDayEndUTC.getUTCDate() + 1);
    const queryStart = previousDayStartUTC;
    const queryEnd = nextDayEndUTC;
    const filterStart = startOfDayUTC;
    const filterEnd = endOfDayUTC;

    if (isNaN(filterStart.getTime()) || isNaN(filterEnd.getTime())) {
      return NextResponse.json(ResponseBuilder.error('INVALID_DATE_FORMAT'), { status: API.STATUS.BAD_REQUEST });
    }
    if (filterStart > filterEnd) {
      return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: API.STATUS.BAD_REQUEST });
    }

    const ordersWhereClause = buildOrdersWhereClause(status, queryStart, queryEnd);
    if (userScope.outletId) {
      const outletObj = await db.outlets.findById(userScope.outletId);
      if (outletObj) ordersWhereClause.outletId = outletObj.id;
    } else if (userScope.merchantId) {
      const merchant = await db.merchants.findById(userScope.merchantId);
      if (merchant && merchant.outlets) ordersWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
    }

    const allOrders = await prisma.order.findMany({
      where: ordersWhereClause,
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        securityDeposit: true,
        damageFee: true,
        outletId: true,
        customerId: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        pickedUpAt: true,
        returnedAt: true,
        createdAt: true,
        updatedAt: true,
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        outlet: { select: { id: true, name: true } }
      },
      take: 10000
    });

    type OrderEntry = {
      id: number;
      orderNumber: string;
      orderType: string;
      status: string;
      revenue: number;
      revenueType: string;
      description: string;
      revenueDate: string;
      customerId?: number | null;
      customerName?: string;
      customerPhone?: string;
      outletId: number;
      outletName?: string;
      createdAt?: string;
      pickupPlanAt?: string | null;
      returnPlanAt?: string | null;
      totalAmount: number;
      depositAmount: number;
      securityDeposit: number;
      damageFee: number;
    };

    const dailyDataMap = new Map<string, {
      date: string;
      dateISO: string;
      dateObj: Date;
      orders: OrderEntry[];
    }>();

    const ordersInList = new Map<string, { index: number; revenue: number; events: Array<{ revenueType: string; description: string; revenueDate: string }> }>();

    for (const order of allOrders) {
      const orderData = {
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
      let revenueEvents = getOrderRevenueEvents(orderData, filterStart, filterEnd);
      revenueEvents = filterEventsByStatus(revenueEvents, status);

      for (const event of revenueEvents) {
        if (event.date < filterStart || event.date > filterEnd) continue;
        const dateKey = getUTCDateKey(event.date);
        const dateISO = normalizeDateToISO(event.date);
        const dateObj = new Date(dateISO);
        if (!dailyDataMap.has(dateKey)) {
          dailyDataMap.set(dateKey, { date: dateKey, dateISO, dateObj, orders: [] });
        }
        const dailyData = dailyDataMap.get(dateKey)!;
        const orderKey = `${order.id}-${dateKey}`;
        const existing = ordersInList.get(orderKey);
        const customer = order.customer;
        const customerName = customer ? [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || undefined : undefined;

        if (existing) {
          const entry = dailyData.orders[existing.index];
          existing.revenue += event.revenue;
          existing.events.push({ revenueType: event.revenueType, description: event.description, revenueDate: event.date.toISOString() });
          entry.revenue = existing.revenue;
          if (existing.events.length > 1) {
            entry.revenueType = 'MULTIPLE';
            entry.description = [...new Set(existing.events.map((e) => e.description))].join(' + ');
          }
        } else {
          const idx = dailyData.orders.length;
          dailyData.orders.push({
            id: order.id,
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            status: order.status,
            revenue: event.revenue,
            revenueType: event.revenueType,
            description: event.description,
            revenueDate: event.date.toISOString(),
            customerId: order.customerId ?? undefined,
            customerName,
            customerPhone: customer?.phone ?? undefined,
            outletId: order.outletId,
            outletName: (order as { outlet?: { name: string } }).outlet?.name ?? undefined,
            createdAt: order.createdAt?.toISOString(),
            pickupPlanAt: order.pickupPlanAt?.toISOString() ?? null,
            returnPlanAt: order.returnPlanAt?.toISOString() ?? null,
            totalAmount: order.totalAmount || 0,
            depositAmount: order.depositAmount || 0,
            securityDeposit: order.securityDeposit || 0,
            damageFee: order.damageFee || 0
          });
          ordersInList.set(orderKey, {
            index: idx,
            revenue: event.revenue,
            events: [{ revenueType: event.revenueType, description: event.description, revenueDate: event.date.toISOString() }]
          });
        }
      }
    }

    if (plan) {
      const expectedPickupWhereClause: any = {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.RESERVED,
        pickupPlanAt: { gte: filterStart, lte: filterEnd, not: null },
        deletedAt: null
      };
      if (userScope.outletId) {
        const outletObj = await db.outlets.findById(userScope.outletId);
        if (outletObj) expectedPickupWhereClause.outletId = outletObj.id;
      } else if (userScope.merchantId) {
        const merchant = await db.merchants.findById(userScope.merchantId);
        if (merchant && merchant.outlets) expectedPickupWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
      }
      const expectedPickupOrders = await prisma.order.findMany({
        where: expectedPickupWhereClause,
        select: {
          id: true, orderNumber: true, orderType: true, status: true, outletId: true, customerId: true,
          totalAmount: true, depositAmount: true, securityDeposit: true, damageFee: true,
          createdAt: true, pickupPlanAt: true, returnPlanAt: true,
          customer: { select: { firstName: true, lastName: true, phone: true } },
          outlet: { select: { id: true, name: true } }
        }
      });
      for (const order of expectedPickupOrders) {
        if (!order.pickupPlanAt) continue;
        const dateKey = getUTCDateKey(new Date(order.pickupPlanAt));
        const dateISO = normalizeDateToISO(order.pickupPlanAt);
        const dateObj = new Date(dateISO);
        if (!dailyDataMap.has(dateKey)) dailyDataMap.set(dateKey, { date: dateKey, dateISO, dateObj, orders: [] });
        const dailyData = dailyDataMap.get(dateKey)!;
        const customer = order.customer;
        const customerName = customer ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || undefined : undefined;
        dailyData.orders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          status: order.status,
          revenue: 0,
          revenueType: 'EXPECTED_PICKUP',
          description: 'Expected pickup (not yet picked up)',
          revenueDate: order.pickupPlanAt.toISOString(),
          customerId: order.customerId ?? undefined,
          customerName,
          customerPhone: customer?.phone ?? undefined,
          outletId: order.outletId,
          outletName: order.outlet?.name ?? undefined,
          createdAt: order.createdAt?.toISOString(),
          pickupPlanAt: order.pickupPlanAt?.toISOString() ?? null,
          returnPlanAt: order.returnPlanAt?.toISOString() ?? null,
          totalAmount: order.totalAmount || 0,
          depositAmount: order.depositAmount || 0,
          securityDeposit: order.securityDeposit || 0,
          damageFee: order.damageFee || 0
        });
      }
      const expectedReturnWhereClause: any = {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.PICKUPED,
        returnPlanAt: { gte: filterStart, lte: filterEnd, not: null },
        deletedAt: null
      };
      if (userScope.outletId) {
        const outletObj = await db.outlets.findById(userScope.outletId);
        if (outletObj) expectedReturnWhereClause.outletId = outletObj.id;
      } else if (userScope.merchantId) {
        const merchant = await db.merchants.findById(userScope.merchantId);
        if (merchant && merchant.outlets) expectedReturnWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
      }
      const expectedReturnOrders = await prisma.order.findMany({
        where: expectedReturnWhereClause,
        select: {
          id: true, orderNumber: true, orderType: true, status: true, outletId: true, customerId: true,
          totalAmount: true, depositAmount: true, securityDeposit: true, damageFee: true,
          createdAt: true, pickupPlanAt: true, returnPlanAt: true,
          customer: { select: { firstName: true, lastName: true, phone: true } },
          outlet: { select: { id: true, name: true } }
        }
      });
      for (const order of expectedReturnOrders) {
        if (!order.returnPlanAt) continue;
        const dateKey = getUTCDateKey(new Date(order.returnPlanAt));
        const dateISO = normalizeDateToISO(order.returnPlanAt);
        const dateObj = new Date(dateISO);
        if (!dailyDataMap.has(dateKey)) dailyDataMap.set(dateKey, { date: dateKey, dateISO, dateObj, orders: [] });
        const dailyData = dailyDataMap.get(dateKey)!;
        const customer = order.customer;
        const customerName = customer ? [customer.firstName, customer.lastName].filter(Boolean).join(' ') || undefined : undefined;
        dailyData.orders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          status: order.status,
          revenue: 0,
          revenueType: 'EXPECTED_RETURN',
          description: 'Expected return (not yet returned)',
          revenueDate: order.returnPlanAt.toISOString(),
          customerId: order.customerId ?? undefined,
          customerName,
          customerPhone: customer?.phone ?? undefined,
          outletId: order.outletId,
          outletName: order.outlet?.name ?? undefined,
          createdAt: order.createdAt?.toISOString(),
          pickupPlanAt: order.pickupPlanAt?.toISOString() ?? null,
          returnPlanAt: order.returnPlanAt?.toISOString() ?? null,
          totalAmount: order.totalAmount || 0,
          depositAmount: order.depositAmount || 0,
          securityDeposit: order.securityDeposit || 0,
          damageFee: order.damageFee || 0
        });
      }
    }

    let dailyDataArray = Array.from(dailyDataMap.values()).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
    let pagination: { total: number; limit: number; offset: number; hasMore: boolean } | undefined;

    if (limit !== undefined) {
      const flat: Array<{ dateKey: string; entry: OrderEntry; orderId: number }> = [];
      for (const day of dailyDataArray) {
        for (const entry of day.orders) {
          flat.push({ dateKey: day.date, entry, orderId: entry.id });
        }
      }
      flat.sort((a, b) => {
        const d = a.dateKey.localeCompare(b.dateKey);
        return d !== 0 ? d : a.orderId - b.orderId;
      });
      const total = flat.length;
      const slice = flat.slice(offset, offset + limit);
      const byDate = new Map<string, OrderEntry[]>();
      for (const { dateKey, entry } of slice) {
        if (!byDate.has(dateKey)) byDate.set(dateKey, []);
        byDate.get(dateKey)!.push(entry);
      }
      dailyDataArray = dailyDataArray.map((day) => ({
        ...day,
        orders: byDate.get(day.date) ?? []
      }));
      pagination = { total, limit, offset, hasMore: offset + limit < total };
    }

    const days = dailyDataArray.map(({ dateObj, ...rest }) => rest);

    const data: { startDate: string; endDate: string; days: typeof days; pagination?: typeof pagination } = {
      startDate,
      endDate,
      days
    };
    if (pagination) data.pagination = pagination;

    return NextResponse.json(ResponseBuilder.success('INCOME_ORDERS_SUCCESS', data));
  } catch (error) {
    console.error('Error fetching income orders:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';
