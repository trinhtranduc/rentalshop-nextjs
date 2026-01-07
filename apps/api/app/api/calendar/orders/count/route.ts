import { NextRequest, NextResponse } from 'next/server';
import { withReadOnlyAuth } from '@rentalshop/auth';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ORDER_TYPE, ORDER_STATUS, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

// Validation schema for orders count query
const ordersCountQuerySchema = z.object({
  outletId: z.coerce.number().int().positive().optional(),
  merchantId: z.coerce.number().int().positive().optional(),
  orderType: z.enum([
    ORDER_TYPE.RENT,
    ORDER_TYPE.SALE
  ] as [string, ...string[]]).optional(),
  // Status filter - can filter by RESERVED, PICKUPED, COMPLETED, RETURNED, CANCELLED
  status: z.enum([
    ORDER_STATUS.RESERVED,
    ORDER_STATUS.PICKUPED,
    ORDER_STATUS.COMPLETED,
    ORDER_STATUS.RETURNED,
    ORDER_STATUS.CANCELLED
  ] as [string, ...string[]]).optional(),
  // Optional date range filter (pickupPlanAt for RESERVED/PICKUPED, createdAt for others)
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional(),
});

/**
 * 🎯 Calendar Orders Count API
 * 
 * Returns count of orders by status for calendar display
 * - Counts orders filtered by status (RESERVED, PICKUPED, COMPLETED, RETURNED, CANCELLED)
 * - Supports filtering by outlet, merchant, orderType, and date range
 * - Optimized for quick count queries
 */
export const GET = withReadOnlyAuth(async (
  request: NextRequest,
  { user, userScope }
) => {
  console.log(`🔍 GET /api/calendar/orders/count - User: ${user.email} (${user.role})`);
  console.log(`🔍 Calendar Orders Count API - UserScope:`, userScope);

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const validatedQuery = ordersCountQuerySchema.parse(query);

    console.log('📅 Orders count query:', validatedQuery);

    const { outletId, merchantId, orderType, status, startDate, endDate } = validatedQuery;

    // Build where clause with role-based filtering
    const where: any = {};

    // Add status filter if provided
    if (status) {
      where.status = status as any;
    }

    // Add optional filters
    if (orderType) {
      where.orderType = orderType;
    }

    // Date range filter
    // For RESERVED/PICKUPED: filter by pickupPlanAt
    // For others: filter by createdAt
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (status === ORDER_STATUS.RESERVED || status === ORDER_STATUS.PICKUPED) {
        // Filter by pickupPlanAt for RESERVED and PICKUPED orders
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
        // Filter by createdAt for other statuses
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

    // Role-based filtering
    if (user.role === USER_ROLE.ADMIN) {
      // ADMIN: Can see all orders, optionally filter by outletId
      if (outletId) {
        where.outletId = outletId;
      }
      // No restrictions for ADMIN - they can see all merchants and outlets
    } else if (user.role === USER_ROLE.MERCHANT) {
      // MERCHANT: Can see orders from all their outlets
      // Filter by outlet.merchantId through relation
      where.outlet = {
        merchantId: userScope.merchantId
      };
      if (outletId) {
        where.outletId = outletId;
        // Remove outlet filter if outletId is specified
        delete where.outlet;
      }
    } else if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
      // OUTLET users: Can only see orders from their assigned outlet
      where.outletId = userScope.outletId;
    }

    console.log('🔍 Orders count where clause:', where);

    // If date range is provided, return breakdown by date
    // Otherwise, return total count
    if (startDate && endDate) {
      // Determine which date field to use based on status
      const dateField = (status === ORDER_STATUS.RESERVED || status === ORDER_STATUS.PICKUPED) 
        ? 'pickupPlanAt' 
        : 'createdAt';
      
      // Use db.orders.search to fetch orders (will get all fields but we only use date field)
      const ordersResult = await db.orders.search({
        where,
        limit: 10000, // Get all orders in the month
        page: 1
      });

      // Group by date (YYYY-MM-DD format)
      const countByDate: Record<string, number> = {};
      
      if (ordersResult.data) {
        for (const order of ordersResult.data) {
          // Get date value based on status
          const dateValue = dateField === 'pickupPlanAt' 
            ? order.pickupPlanAt 
            : order.createdAt;
          
          if (dateValue) {
            const date = new Date(dateValue);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            countByDate[dateKey] = (countByDate[dateKey] || 0) + 1;
          }
        }
      }

      console.log('📦 Orders count by date:', countByDate);

      return NextResponse.json(
        ResponseBuilder.success('ORDERS_COUNT_SUCCESS', {
          countByDate, // Breakdown by date
          total: Object.values(countByDate).reduce((sum, count) => sum + count, 0),
          filters: {
            outletId: outletId || null,
            merchantId: merchantId || null,
            orderType: orderType || null,
            status: status || null,
            startDate: startDate || null,
            endDate: endDate || null
          }
        })
      );
    } else {
      // No date range - return total count only
      const count = await db.orders.getStats(where);

      console.log('📦 Orders count:', count);

      return NextResponse.json(
        ResponseBuilder.success('ORDERS_COUNT_SUCCESS', {
          count,
          filters: {
            outletId: outletId || null,
            merchantId: merchantId || null,
            orderType: orderType || null,
            status: status || null,
            startDate: startDate || null,
            endDate: endDate || null
          }
        })
      );
    }

  } catch (error) {
    console.error('❌ Calendar Orders Count API error:', error);
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';

