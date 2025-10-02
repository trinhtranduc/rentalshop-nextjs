import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import type { CalendarOrderSummary, DayOrders, CalendarResponse } from '@rentalshop/utils';

// Validation schema for calendar orders query
const calendarOrdersQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020).max(2030),
  outletId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(10).default(4), // Max 4 orders per day
});

// Types are now imported from @rentalshop/utils

/**
 * 🎯 Calendar Orders API
 * 
 * Returns order counts and summaries for calendar display
 * - Groups orders by date
 * - Separates pickups and returns
 * - Limits to 3-4 orders per day for performance
 * - Optimized for calendar UI
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (
  request: NextRequest,
  { user, userScope }
) => {
  console.log(`🔍 GET /api/calendar/orders - User: ${user.email} (${user.role})`);
  console.log(`🔍 Calendar API - UserScope:`, userScope);

  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const validatedQuery = calendarOrdersQuerySchema.parse(query);

    console.log('📅 Calendar query:', validatedQuery);

    const { month, year, outletId, limit } = validatedQuery;

    // Build date range for the requested month
    const startDate = new Date(year, month - 1, 1); // month is 1-based
    const endDate = new Date(year, month, 0); // Last day of the month

    console.log('📅 Date range:', { startDate, endDate });

    // Build where clause with role-based filtering
    const where: any = {
      orderType: 'RENT',
      status: {
        in: ['RESERVED', 'PICKUPED', 'RETURNED']
      },
      OR: [
        {
          pickupPlanAt: {
            gte: startDate,
            lte: endDate
          }
        },
        {
          returnPlanAt: {
            gte: startDate,
            lte: endDate
          }
        }
      ]
    };

    // Role-based outlet filtering
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      where.outletId = userScope.outletId;
    } else if (user.role === 'MERCHANT') {
      where.outletId = outletId || userScope.outletId;
    } else if (user.role === 'ADMIN') {
      if (outletId) {
        where.outletId = outletId;
      }
    }

    console.log('🔍 Calendar where clause:', where);

    // Fetch orders for the month
    const orders = await db.orders.search({
      ...where,
      limit: 1000, // Get all orders for the month
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true } },
        outlet: { select: { id: true, name: true } },
        orderItems: {
          include: {
            product: { select: { id: true, name: true } }
          }
        }
      }
    });

    console.log('📦 Found orders:', orders.data?.length || 0);

    // Group orders by date
    const calendarData: CalendarResponse = {};

    if (orders.data && Array.isArray(orders.data)) {
      for (const order of orders.data) {
        const orderSummary: CalendarOrderSummary = {
          id: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer?.firstName ? 
            `${order.customer.firstName} ${order.customer.lastName || ''}`.trim() : 
            'Unknown Customer',
          productName: order.orderItems?.[0]?.product?.name || 'Unknown Product',
          status: order.status,
          totalAmount: order.totalAmount,
          pickupPlanAt: order.pickupPlanAt ? new Date(order.pickupPlanAt).toISOString() : undefined,
          returnPlanAt: order.returnPlanAt ? new Date(order.returnPlanAt).toISOString() : undefined
        };

        // Add to pickup dates
        if (order.pickupPlanAt) {
          const pickupDate = new Date(order.pickupPlanAt);
          const dateKey = pickupDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          if (!calendarData[dateKey]) {
            calendarData[dateKey] = { pickups: [], returns: [], total: 0 };
          }
          
          if (calendarData[dateKey].pickups.length < limit) {
            calendarData[dateKey].pickups.push(orderSummary);
          }
        }

        // Add to return dates
        if (order.returnPlanAt) {
          const returnDate = new Date(order.returnPlanAt);
          const dateKey = returnDate.toISOString().split('T')[0]; // YYYY-MM-DD format
          
          if (!calendarData[dateKey]) {
            calendarData[dateKey] = { pickups: [], returns: [], total: 0 };
          }
          
          if (calendarData[dateKey].returns.length < limit) {
            calendarData[dateKey].returns.push(orderSummary);
          }
        }
      }

      // Calculate totals for each day
      for (const dateKey in calendarData) {
        calendarData[dateKey].total = calendarData[dateKey].pickups.length + calendarData[dateKey].returns.length;
      }

      // Calculate monthly statistics
      let totalPickups = 0;
      let totalReturns = 0;
      let totalOrders = 0;

      for (const dateKey in calendarData) {
        totalPickups += calendarData[dateKey].pickups.length;
        totalReturns += calendarData[dateKey].returns.length;
        totalOrders += calendarData[dateKey].total;
      }

      console.log('📅 Calendar data prepared:', {
        daysWithOrders: Object.keys(calendarData).length,
        totalPickups,
        totalReturns,
        totalOrders
      });

      return NextResponse.json({
        success: true,
        data: calendarData,
        meta: {
          month,
          year,
          totalDays: Object.keys(calendarData).length,
          stats: {
            totalPickups,
            totalReturns,
            totalOrders
          },
          dateRange: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          }
        },
        message: `Calendar data for ${year}-${String(month).padStart(2, '0')}`
      });
    }

    // Return empty calendar data if orders.data is not an array
    return NextResponse.json({
      success: true,
      data: {},
      meta: {
        month,
        year,
        totalDays: 0,
        stats: {
          totalPickups: 0,
          totalReturns: 0,
          totalOrders: 0
        },
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      },
      message: `No calendar data for ${year}-${String(month).padStart(2, '0')}`
    });

  } catch (error) {
    console.error('❌ Calendar API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid query parameters',
          errors: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch calendar data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});
