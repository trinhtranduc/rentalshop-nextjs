import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import type { CalendarOrderSummary, DayOrders, CalendarResponse } from '@rentalshop/utils';
import { handleApiError } from '@rentalshop/utils';

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

    // Build where clause with role-based filtering - only pickup orders
    const where: any = {
      orderType: 'RENT',
      status: {
        in: ['RESERVED', 'PICKUPED', 'RETURNED']
      },
      pickupPlanAt: {
        gte: startDate,
        lte: endDate
      }
    };

    // Role-based filtering
    if (user.role === 'ADMIN') {
      // ADMIN: Can see all orders, optionally filter by outletId
      if (outletId) {
        where.outletId = outletId;
      }
      // No merchantId filter for ADMIN - they can see all merchants
    } else if (user.role === 'MERCHANT') {
      // MERCHANT: Can see orders from all their outlets
      where.merchantId = userScope.merchantId;
      if (outletId) {
        where.outletId = outletId;
      }
      // If no outletId specified, they see all outlets within their merchant
    } else if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      // OUTLET users: Can only see orders from their assigned outlet
      where.merchantId = userScope.merchantId;
      where.outletId = userScope.outletId;
    }

    console.log('🔍 Calendar where clause:', where);

    // Fetch orders for the month using simplified database API
    const orders = await db.orders.search({
      ...where,
      limit: 1000, // Get all orders for the month
      page: 1
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
          customerPhone: order.customer?.phone,
          status: order.status,
          totalAmount: order.totalAmount,
          outletName: order.outlet?.name,
          pickupPlanAt: order.pickupPlanAt ? new Date(order.pickupPlanAt).toISOString() : undefined,
          returnPlanAt: order.returnPlanAt ? new Date(order.returnPlanAt).toISOString() : undefined,
          // Include order items with flattened product data
          orderItems: (order as any).orderItems?.map((item: any) => ({
            id: item.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
            // Flattened product data
            productId: item.product?.id,
            productName: item.product?.name,
            productBarcode: item.product?.barcode,
            productImages: item.product?.images,
            productRentPrice: item.product?.rentPrice,
            productDeposit: item.product?.deposit
          })) || []
        };

        // Add to pickup dates
        if (order.pickupPlanAt) {
          const pickupDate = new Date(order.pickupPlanAt);
          const dateKey = `${pickupDate.getFullYear()}-${String(pickupDate.getMonth() + 1).padStart(2, '0')}-${String(pickupDate.getDate()).padStart(2, '0')}`;
          
          if (!calendarData[dateKey]) {
            calendarData[dateKey] = { pickups: [], total: 0 };
          }
          
          if (calendarData[dateKey].pickups.length < limit) {
            calendarData[dateKey].pickups.push(orderSummary);
            calendarData[dateKey].total++;
          }
        }

        // Only process pickup orders - skip return dates
      }

      // Total is already calculated when adding orders

      // Calculate monthly statistics (only pickup orders)
      let totalPickups = 0;
      let totalOrders = 0;

      for (const dateKey in calendarData) {
        totalPickups += calendarData[dateKey].pickups.length;
        totalOrders += calendarData[dateKey].total;
      }

      console.log('📅 Calendar data prepared:', {
        daysWithOrders: Object.keys(calendarData).length,
        totalPickups,
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
            totalOrders
          },
          dateRange: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          }
        },
        code: 'CALENDAR_DATA_SUCCESS', message: `Calendar data for ${year}-${String(month).padStart(2, '0')}`
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
          totalOrders: 0
        },
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        }
      },
      code: 'NO_CALENDAR_DATA', message: `No calendar data for ${year}-${String(month).padStart(2, '0')}`
    });

  } catch (error) {
    console.error('❌ Calendar API error:', error);
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
