import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ORDER_TYPE, ORDER_STATUS } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, getCalendarDayRangeInTimeZone } from '@rentalshop/utils';
import { calendarDayKey, calendarScopeWhere, isValidTimeZone } from '../../../../../lib/calendar-scope';
import { getOperationsDay } from '../../../../../lib/outlet-operations-day';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const ordersCountQuerySchema = z.object({
  outletId: z.coerce.number().int().positive().optional(),
  merchantId: z.coerce.number().int().positive().optional(),
  orderType: z.enum([ORDER_TYPE.RENT, ORDER_TYPE.SALE] as [string, ...string[]]).optional(),
  status: z.enum([
    ORDER_STATUS.RESERVED,
    ORDER_STATUS.PICKUPED,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.RETURNED,
    ORDER_STATUS.CANCELLED
  ] as [string, ...string[]]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'From date must be in YYYY-MM-DD format').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'To date must be in YYYY-MM-DD format').optional(),
  month: z.coerce.number().int().min(1).max(12).optional(), // Month (1-12)
  year: z.coerce.number().int().min(2000).max(2100).optional(), // Year (defaults to current year)
  /** IANA zone of the device for day keys (#362); the Vietnam day when missing */
  timeZone: z.string().min(1).max(64).refine(isValidTimeZone, 'Unknown time zone').optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build where clause with role-based access control
 */
function buildWhereClause(
  user: any,
  userScope: any,
  filters: {
    outletId?: number;
    merchantId?: number;
    orderType?: string;
    status?: string;
    from?: string;
    to?: string;
  },
  dateField: 'pickupPlanAt' | 'returnPlanAt' = 'pickupPlanAt'
): any {
  const where: any = {};

  // Status and order type filters
  // 🎯 Filter by status from request (e.g., status=RESERVED)
  if (filters.status) {
    where.status = filters.status;
    console.log('🔍 Filtering by status:', filters.status);
  }
  if (filters.orderType) where.orderType = filters.orderType;

  // Date range filter (from/to)
  // 🎯 Calendar always filters by pickupPlanAt (pickup date plan)
  if (filters.from || filters.to) {
    // ✅ FIX: Parse dates as UTC and use wider range to capture all potentially relevant orders
    // Orders are stored with time component (e.g., "2026-02-25T17:00:00.000Z")
    // So we need a wider range to capture orders that might shift due to timezone
    const fromDate = filters.from ? new Date(filters.from + 'T00:00:00.000Z') : null;
    const toDate = filters.to ? new Date(filters.to + 'T23:59:59.999Z') : null;

    // Use wider range: from previous day to next day to capture all orders
    const previousDayStartUTC = fromDate ? new Date(fromDate) : null;
    if (previousDayStartUTC) {
      previousDayStartUTC.setUTCDate(previousDayStartUTC.getUTCDate() - 1);
    }
    const nextDayEndUTC = toDate ? new Date(toDate) : null;
    if (nextDayEndUTC) {
      nextDayEndUTC.setUTCDate(nextDayEndUTC.getUTCDate() + 1);
    }

    // Pickup plan for the calendar counts, return plan for the returns per day (#362)
    where[dateField] = {};
    if (previousDayStartUTC) {
      where[dateField].gte = previousDayStartUTC;
    }
    if (nextDayEndUTC) {
      where[dateField].lte = nextDayEndUTC;
    }
    console.log('🔍 Filtering by pickupPlanAt (wider range):', {
      from: filters.from,
      to: filters.to,
      fromDate: fromDate?.toISOString(),
      toDate: toDate?.toISOString(),
      previousDayStartUTC: previousDayStartUTC?.toISOString(),
      nextDayEndUTC: nextDayEndUTC?.toISOString()
    });
  }

  // Role-based access control; a merchant's outletId stays inside its merchant (#362)
  Object.assign(where, calendarScopeWhere(user, userScope, filters.outletId));

  return where;
}

/**
 * Group orders by date (YYYY-MM-DD format)
 * ✅ FIX: Uses local date key to match frontend calendar display
 * Converts UTC datetime to local date (VN UTC+7) before grouping
 */
function groupOrdersByDate(
  orders: any[],
  dateField: 'pickupPlanAt' | 'returnPlanAt' | 'createdAt',
  keyOf: (instant: Date | string) => string
): Record<string, number> {
  const countByDate: Record<string, number> = {};

  for (const order of orders) {
    const dateValue = order[dateField];
    if (dateValue) {
      // ✅ FIX: Get local date key directly from UTC datetime
      // getLocalDateKey now converts UTC datetime to local date (VN UTC+7)
      // No need to normalize first, as it would lose the local date information
      // Example: "2026-02-24T17:00:00.000Z" (17:00 UTC = 00:00 VN ngày 25) → "2026-02-25"
      const dateKey = keyOf(dateValue);
      if (dateKey) {
      countByDate[dateKey] = (countByDate[dateKey] || 0) + 1;
      }
    }
  }

  return countByDate;
}

/**
 * Generate all dates between from and to (inclusive)
 * Returns array of date strings in YYYY-MM-DD format
 */
function generateDateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  // `YYYY-MM-DD` keys walked on UTC dates, so the server's own time zone never shifts them
  const currentDate = new Date(`${from}T00:00:00.000Z`);
  const endDate = new Date(`${to}T00:00:00.000Z`);
  while (currentDate <= endDate) {
    dates.push(currentDate.toISOString().slice(0, 10));
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }
  
  return dates;
}

/**
 * Fill missing dates with 0 count
 * Ensures all dates from 'from' to 'to' are included in the result
 */
function fillDateRange(
  countByDate: Record<string, number>,
  from: string,
  to: string
): Record<string, number> {
  const allDates = generateDateRange(from, to);
  const filled: Record<string, number> = {};
  
  for (const date of allDates) {
    filled[date] = countByDate[date] || 0;
  }
  
  return filled;
}

/**
 * Get start and end date of a month
 * @param month - Month number (1-12)
 * @param year - Year (defaults to current year)
 * @returns Object with from (YYYY-MM-DD) and to (YYYY-MM-DD)
 */
function getMonthDateRange(month: number, year?: number): { from: string; to: string } {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month - 1; // JavaScript months are 0-indexed
  
  // First day of month
  const firstDay = new Date(targetYear, targetMonth, 1);
  const from = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
  
  // Last day of month
  const lastDay = new Date(targetYear, targetMonth + 1, 0);
  const to = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;
  
  return { from, to };
}

// ============================================================================
// API ROUTE
// ============================================================================

/**
 * GET /api/calendar/orders/count
 * Get count of orders by status for calendar display
 * 
 * Authorization: Requires 'orders.view' permission
 */
export const GET = withPermissions(['orders.view'], { requireActiveSubscription: false })(
  async (request: NextRequest, { user, userScope }) => {
    try {
      // Parse and validate query parameters
      const { searchParams } = new URL(request.url);
      const query = Object.fromEntries(searchParams.entries());
      const validatedQuery = ordersCountQuerySchema.parse(query);

      const { outletId, merchantId, orderType, status, from, to, month, year, timeZone } = validatedQuery;
      const keyOf = calendarDayKey(timeZone);

      // If month is provided, calculate from/to automatically
      let finalFrom = from;
      let finalTo = to;
      
      if (month) {
        const monthRange = getMonthDateRange(month, year);
        finalFrom = monthRange.from;
        finalTo = monthRange.to;
        
        console.log('📅 Month parameter detected:', {
          month,
          year: year || 'current',
          from: finalFrom,
          to: finalTo,
        });
      }

      // Build where clause with role-based filtering
      const where = buildWhereClause(user, userScope, {
        outletId,
        merchantId,
        orderType,
        status,
        from: finalFrom,
        to: finalTo,
      });

      // If date range provided (from/to or month), return breakdown by date with all dates filled
      if (finalFrom && finalTo) {
        // 🎯 Calendar always groups by pickupPlanAt (pickup date plan)
        const dateField = 'pickupPlanAt';

        const ordersResult = await db.orders.search({
          where,
          limit: 10000,
          page: 1,
        });

        const sampleOrders = (ordersResult.data || []).slice(0, 3).map((order: any) => ({
          id: order.id,
          status: order.status,
          pickupPlanAt: order.pickupPlanAt,
          createdAt: order.createdAt
        }));
        
        console.log('🔍 Calendar orders search:', {
          where,
          status: status || 'all',
          ordersFound: ordersResult.data?.length || 0,
          sampleOrders
        });

        // 🎯 Group orders by pickupPlanAt date (always use pickupPlanAt for calendar)
        // Status filter is already applied in where clause
        const countByDate = groupOrdersByDate(ordersResult.data || [], dateField, keyOf);
        
        console.log('📊 Orders grouped by pickupPlanAt:', {
          status: status || 'all',
          countByDateKeys: Object.keys(countByDate).length,
          sampleCounts: Object.entries(countByDate).slice(0, 5)
        });
        
        // Fill all dates from 'from' to 'to' with 0 if no orders
        const filledCountByDate = fillDateRange(countByDate, finalFrom, finalTo);
        
        const total = Object.values(filledCountByDate).reduce((sum, count) => sum + count, 0);

        // Mobile calendar (#362): hand-overs (RESERVED by pickup plan) and returns (PICKUPED by return plan)
        // per day, whatever `status` asked for, plus rentals already late on their return
        const rangeFilters = { outletId, merchantId, orderType, from: finalFrom, to: finalTo };
        const [pickupOrders, returnOrders, lateReturns] = await Promise.all([
          db.orders.search({ where: buildWhereClause(user, userScope, { ...rangeFilters, status: ORDER_STATUS.RESERVED }), limit: 10000, page: 1 }),
          db.orders.search({ where: buildWhereClause(user, userScope, { ...rangeFilters, status: ORDER_STATUS.PICKUPED }, 'returnPlanAt'), limit: 10000, page: 1 }),
          db.orders.getStats({
            ...buildWhereClause(user, userScope, { outletId, merchantId, orderType, status: ORDER_STATUS.PICKUPED }),
            returnPlanAt: {
              lt: timeZone ? getCalendarDayRangeInTimeZone(new Date(), timeZone).start : getOperationsDay().start,
            },
          }),
        ]);
        const pickupsByDate = fillDateRange(groupOrdersByDate(pickupOrders.data || [], 'pickupPlanAt', keyOf), finalFrom, finalTo);
        const returnsByDate = fillDateRange(groupOrdersByDate(returnOrders.data || [], 'returnPlanAt', keyOf), finalFrom, finalTo);
        const byDate = Object.fromEntries(
          Object.keys(filledCountByDate).map((key) => [key, { pickups: pickupsByDate[key] || 0, returns: returnsByDate[key] || 0 }])
        );

        console.log('📦 Calendar orders count:', {
          from: finalFrom,
          to: finalTo,
          month: month || null,
          year: year || null,
          totalDays: Object.keys(filledCountByDate).length,
          totalOrders: total,
          ordersFound: ordersResult.data?.length || 0,
        });

        return NextResponse.json(
          ResponseBuilder.success('ORDERS_COUNT_SUCCESS', {
            countByDate: filledCountByDate,
            total,
            byDate,
            lateReturns,
            filters: {
              outletId: outletId || null,
              merchantId: merchantId || null,
              orderType: orderType || null,
              status: status || null,
              from: finalFrom || null,
              to: finalTo || null,
              month: month || null,
              year: year || null,
            },
          })
        );
      }

      // No date range - return total count only
      const count = await db.orders.getStats(where);

      return NextResponse.json(
        ResponseBuilder.success('ORDERS_COUNT_SUCCESS', {
          count,
          filters: {
            outletId: outletId || null,
            merchantId: merchantId || null,
            orderType: orderType || null,
            status: status || null,
            from: finalFrom || null,
            to: finalTo || null,
            month: month || null,
            year: year || null,
          },
        })
      );
    } catch (error) {
      console.error('❌ Calendar Orders Count API error:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);

export const runtime = 'nodejs';
