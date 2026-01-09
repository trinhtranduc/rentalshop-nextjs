import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ORDER_TYPE, ORDER_STATUS, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';

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
  }
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
    const fromDate = filters.from ? new Date(filters.from) : null;
    const toDate = filters.to ? new Date(filters.to) : null;

    // Calendar always uses pickupPlanAt for filtering (ngày dự kiến lấy)
    where.pickupPlanAt = {};
    if (fromDate) {
      fromDate.setHours(0, 0, 0, 0);
      where.pickupPlanAt.gte = fromDate;
    }
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
      where.pickupPlanAt.lte = toDate;
    }
    console.log('🔍 Filtering by pickupPlanAt:', {
      from: filters.from,
      to: filters.to,
      fromDate: fromDate?.toISOString(),
      toDate: toDate?.toISOString()
    });
  }

  // Role-based access control
  if (user.role === USER_ROLE.ADMIN) {
    // ADMIN: Can see all orders, optionally filter by outletId
    if (filters.outletId) {
      where.outletId = filters.outletId;
    }
  } else if (user.role === USER_ROLE.MERCHANT) {
    // MERCHANT: Can see orders from all their outlets
    if (filters.outletId) {
      where.outletId = filters.outletId;
    } else {
      where.outlet = { merchantId: userScope.merchantId };
    }
  } else if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
    // OUTLET users: Can only see orders from their assigned outlet
    const allowedOutletId = filters.outletId && filters.outletId === userScope.outletId
      ? filters.outletId
      : userScope.outletId;
    where.outletId = allowedOutletId;
  }

  return where;
}

/**
 * Group orders by date (YYYY-MM-DD format)
 */
function groupOrdersByDate(
  orders: any[],
  dateField: 'pickupPlanAt' | 'createdAt'
): Record<string, number> {
  const countByDate: Record<string, number> = {};

  for (const order of orders) {
    const dateValue = dateField === 'pickupPlanAt' ? order.pickupPlanAt : order.createdAt;
    if (dateValue) {
      const date = new Date(dateValue);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      countByDate[dateKey] = (countByDate[dateKey] || 0) + 1;
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
  const startDate = new Date(from);
  const endDate = new Date(to);
  
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    currentDate.setDate(currentDate.getDate() + 1);
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

      const { outletId, merchantId, orderType, status, from, to, month, year } = validatedQuery;

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
        const countByDate = groupOrdersByDate(ordersResult.data || [], dateField);
        
        console.log('📊 Orders grouped by pickupPlanAt:', {
          status: status || 'all',
          countByDateKeys: Object.keys(countByDate).length,
          sampleCounts: Object.entries(countByDate).slice(0, 5)
        });
        
        // Fill all dates from 'from' to 'to' with 0 if no orders
        const filledCountByDate = fillDateRange(countByDate, finalFrom, finalTo);
        
        const total = Object.values(filledCountByDate).reduce((sum, count) => sum + count, 0);

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
