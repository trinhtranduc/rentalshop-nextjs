import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import type { CalendarOrderSummary, DayOrders, CalendarResponse, CalendarDay } from '@rentalshop/utils';
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
      // ADMIN: Can see all orders, optionally filter by outletId
      if (outletId) {
        where.outletId = outletId;
      }
      // No restrictions for ADMIN - they can see all merchants and outlets
    } else if (user.role === 'MERCHANT') {
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
    } else if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      // OUTLET users: Can only see orders from their assigned outlet
      where.outletId = userScope.outletId;
    }

    console.log('🔍 Calendar where clause:', where);

    // Fetch orders for the month with orderItems included using db.orders.searchWithItems
    const ordersResult = await db.orders.searchWithItems({
      where,
      limit: 1000, // Get all orders for the month
      page: 1
    });
    
    const orders = ordersResult.data;

    console.log('📦 Found orders:', orders?.length || 0);

    // Group orders by date
    const calendarMap: { [dateKey: string]: CalendarOrderSummary[] } = {};

    if (orders && Array.isArray(orders)) {
      for (const order of orders) {
        const orderItems = (order as any).orderItems || [];
        const totalProductCount = orderItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
        const firstProduct = orderItems[0]?.product;
        
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
          // Product summary for calendar display
          productName: firstProduct?.name || 'Multiple Products',
          productCount: totalProductCount,
          // Include order items with flattened product data
          orderItems: orderItems.map((item: any) => ({
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
          }))
        };

        // Add to pickup dates
        if (order.pickupPlanAt) {
          const pickupDate = new Date(order.pickupPlanAt);
          const dateKey = `${pickupDate.getFullYear()}-${String(pickupDate.getMonth() + 1).padStart(2, '0')}-${String(pickupDate.getDate()).padStart(2, '0')}`;
          
          if (!calendarMap[dateKey]) {
            calendarMap[dateKey] = [];
          }
          
          if (calendarMap[dateKey].length < limit) {
            calendarMap[dateKey].push(orderSummary);
          }
        }
      }

      // Convert to calendar array format
      const calendar: CalendarDay[] = [];
      let totalOrders = 0;
      let totalRevenue = 0;
      let totalPickups = 0;
      let totalReturns = 0;

      for (const [dateKey, dayOrders] of Object.entries(calendarMap)) {
        const dayRevenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        const dayPickups = dayOrders.filter(order => order.status === 'RESERVED' || order.status === 'PICKUPED').length;
        const dayReturns = dayOrders.filter(order => order.status === 'RETURNED').length;
        
        calendar.push({
          date: dateKey,
          orders: dayOrders,
          summary: {
            totalOrders: dayOrders.length,
            totalRevenue: dayRevenue,
            totalPickups: dayPickups,
            totalReturns: dayReturns,
            averageOrderValue: dayOrders.length > 0 ? dayRevenue / dayOrders.length : 0
          }
        });

        totalOrders += dayOrders.length;
        totalRevenue += dayRevenue;
        totalPickups += dayPickups;
        totalReturns += dayReturns;
      }

      const calendarData: CalendarResponse = {
        calendar,
        summary: {
          totalOrders,
          totalRevenue,
          totalPickups,
          totalReturns,
          averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
        }
      };

      console.log('📅 Calendar data prepared:', {
        daysWithOrders: calendar.length,
        totalPickups,
        totalOrders,
        totalRevenue
      });

      return NextResponse.json({
        success: true,
        data: calendarData,
        meta: {
          totalDays: calendar.length,
          stats: {
            totalPickups,
            totalOrders,
            totalRevenue,
            totalReturns,
            averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
          },
          dateRange: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          }
        },
        code: 'CALENDAR_DATA_SUCCESS', message: `Calendar data for ${startDateStr} to ${endDateStr}`
      });
    }

    // Return empty calendar data if orders is not an array
    const emptyCalendarData: CalendarResponse = {
      calendar: [],
      summary: {
        totalOrders: 0,
        totalRevenue: 0,
        totalPickups: 0,
        totalReturns: 0,
        averageOrderValue: 0
      }
    };

    return NextResponse.json({
      success: true,
      data: emptyCalendarData,
      meta: {
        totalDays: 0,
        stats: {
          totalPickups: 0,
          totalOrders: 0,
          totalRevenue: 0,
          totalReturns: 0,
          averageOrderValue: 0
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
