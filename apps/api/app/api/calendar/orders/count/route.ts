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
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
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
    startDate?: string;
    endDate?: string;
  }
): any {
  const where: any = {};

  // Status and order type filters
  if (filters.status) where.status = filters.status;
  if (filters.orderType) where.orderType = filters.orderType;

  // Date range filter
  if (filters.startDate || filters.endDate) {
    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate ? new Date(filters.endDate) : null;

    // For RESERVED/PICKUPED: filter by pickupPlanAt
    // For others: filter by createdAt
    const dateField = (filters.status === ORDER_STATUS.RESERVED || filters.status === ORDER_STATUS.PICKUPED)
      ? 'pickupPlanAt'
      : 'createdAt';

    if (dateField === 'pickupPlanAt') {
      where.pickupPlanAt = {};
      if (start) {
        start.setHours(0, 0, 0, 0);
        where.pickupPlanAt.gte = start;
      }
      if (end) {
        end.setHours(23, 59, 59, 999);
        where.pickupPlanAt.lte = end;
      }
    } else {
      where.createdAt = {};
      if (start) {
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (end) {
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
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

      const { outletId, merchantId, orderType, status, startDate, endDate } = validatedQuery;

      // Build where clause with role-based filtering
      const where = buildWhereClause(user, userScope, {
        outletId,
        merchantId,
        orderType,
        status,
        startDate,
        endDate,
      });

      // If date range provided, return breakdown by date
      if (startDate && endDate) {
        const dateField = (status === ORDER_STATUS.RESERVED || status === ORDER_STATUS.PICKUPED)
          ? 'pickupPlanAt'
          : 'createdAt';

        const ordersResult = await db.orders.search({
          where,
          limit: 10000,
          page: 1,
        });

        const countByDate = groupOrdersByDate(ordersResult.data || [], dateField);
        const total = Object.values(countByDate).reduce((sum, count) => sum + count, 0);

        return NextResponse.json(
          ResponseBuilder.success('ORDERS_COUNT_SUCCESS', {
            countByDate,
            total,
            filters: {
              outletId: outletId || null,
              merchantId: merchantId || null,
              orderType: orderType || null,
              status: status || null,
              startDate: startDate || null,
              endDate: endDate || null,
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
            startDate: startDate || null,
            endDate: endDate || null,
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
