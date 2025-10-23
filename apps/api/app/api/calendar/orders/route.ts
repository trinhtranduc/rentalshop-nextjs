import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import type { CalendarOrderSummary, DayOrders, CalendarResponse } from '@rentalshop/utils';
import { handleApiError } from '@rentalshop/utils';

// Validation schema for calendar orders query
const calendarOrdersQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  outletId: z.coerce.number().int().positive().optional(),
  merchantId: z.coerce.number().int().positive().optional(),
  status: z.enum(['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED']).optional(),
  orderType: z.enum(['RENT', 'SALE']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10), // Max 50 orders per day
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

    const { startDate: startDateStr, endDate: endDateStr, outletId, merchantId, status, orderType, limit } = validatedQuery;

    // Parse date strings
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    console.log('📅 Date range:', { startDate, endDate });

    // Build where clause with role-based filtering
    const where: any = {
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

    // Add optional filters
    if (orderType) {
      where.orderType = orderType;
    } else {
      // Default to RENT orders if no orderType specified
      where.orderType = 'RENT';
    }
    
    if (status) {
      where.status = status;
    } else {
      // Default to active rental orders if no status specified
      where.status = {
        in: ['RESERVED', 'PICKUPED', 'RETURNED']
      };
    }

    // Role-based filtering
    if (user.role === 'ADMIN') {
      // ADMIN: Can see all orders, optionally filter by outletId or merchantId
      if (outletId) {
        where.outletId = outletId;
      }
      if (merchantId) {
        where.merchantId = merchantId;
      }
      // No restrictions for ADMIN - they can see all merchants and outlets
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
        code: 'CALENDAR_DATA_SUCCESS', message: `Calendar data for ${startDateStr} to ${endDateStr}`
      });
    }

    // Return empty calendar data if orders.data is not an array
    return NextResponse.json({
      success: true,
      data: {},
      meta: {
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
      code: 'NO_CALENDAR_DATA', message: `No calendar data for ${startDateStr} to ${endDateStr}`
    });

  } catch (error) {
    console.error('❌ Calendar API error:', error);
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
