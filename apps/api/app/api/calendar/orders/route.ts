import { NextRequest, NextResponse } from 'next/server';
import { withReadOnlyAuth } from '@rentalshop/auth';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { ORDER_TYPE, ORDER_STATUS, USER_ROLE } from '@rentalshop/constants';
import type { CalendarOrderSummary, DayOrders, CalendarResponse, CalendarDay } from '@rentalshop/utils';
import { handleApiError, getUTCDateKey, getLocalDateKey } from '@rentalshop/utils';

// Validation schema for calendar orders query
const calendarOrdersQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  outletId: z.coerce.number().int().positive().optional(),
  merchantId: z.coerce.number().int().positive().optional(),
  // Calendar chỉ hiển thị đơn RESERVED (đã cọc) - đơn dự kiến lấy
  // RESERVED: hiển thị theo pickupPlanAt (ngày dự kiến lấy)
  // KHÔNG hiển thị: PICKUPED, RETURNED, COMPLETED, CANCELLED
  status: z.enum([
    ORDER_STATUS.RESERVED
  ] as [string, ...string[]]).optional(),
  orderType: z.enum([
    ORDER_TYPE.RENT,
    ORDER_TYPE.SALE
  ] as [string, ...string[]]).optional(),
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
export const GET = withReadOnlyAuth(async (
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
    // Calendar chỉ hiển thị đơn RESERVED (đã cọc) theo pickupPlanAt (ngày dự kiến lấy)
    const where: any = {
      pickupPlanAt: {
        gte: startDate,
        lte: endDate
      }
    };

    // Add optional filters
    if (orderType) {
      where.orderType = orderType;
    } else {
      // Default to RENT orders if no orderType specified
      where.orderType = ORDER_TYPE.RENT as any;
    }
    
    // Calendar chỉ hiển thị đơn RESERVED (đã cọc) - đơn dự kiến lấy
    // RESERVED: hiển thị theo pickupPlanAt (ngày dự kiến lấy)
    // KHÔNG hiển thị: PICKUPED, RETURNED, COMPLETED, CANCELLED
    // Luôn filter chỉ RESERVED, bất kể user có truyền status hay không
    if (status) {
      // Nếu user truyền status, chỉ cho phép RESERVED
      where.status = status; // Schema đã validate chỉ cho phép RESERVED
    } else {
      // Default: luôn chỉ lấy RESERVED (đơn đã cọc)
      where.status = ORDER_STATUS.RESERVED as any;
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

    console.log('🔍 Calendar where clause:', where);

    // Fetch orders for the month with orderItems included using db.orders.searchWithItems
    const ordersResult = await db.orders.searchWithItems({
      where,
      limit: 1000, // Get all orders for the month
      page: 1
    });
    
    const orders = ordersResult.data;

    console.log('📦 Found orders:', orders?.length || 0);

    // Helper function to parse productImages (handle both JSON string and array)
    const parseProductImages = (images: any): string[] => {
      if (!images) return [];
      if (Array.isArray(images)) return images;
      if (typeof images === 'string') {
        try {
          const parsed = JSON.parse(images);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

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
          pickedUpAt: (order as any).pickedUpAt ? new Date((order as any).pickedUpAt).toISOString() : undefined,
          // Product summary for calendar display
          productName: firstProduct?.name || 'Multiple Products',
          productCount: totalProductCount,
          // Include order items with flattened product data
          orderItems: orderItems.map((item: any) => {
            // Parse productImages to ensure it's always an array
            const productImages = parseProductImages(item.product?.images);
            
            return {
              id: item.id,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              notes: item.notes,
              // Flattened product data
              productId: item.product?.id,
              productName: item.product?.name,
              productBarcode: item.product?.barcode,
              productImages: productImages,
              productRentPrice: item.product?.rentPrice,
              productDeposit: item.product?.deposit
            };
          })
        };

        // Calendar chỉ hiển thị đơn RESERVED (đã cọc) theo pickupPlanAt (ngày dự kiến lấy)
        // Chỉ xử lý RESERVED orders
        if (order.status === ORDER_STATUS.RESERVED && order.pickupPlanAt) {
          const displayDate = new Date(order.pickupPlanAt);
          // Use local date key to match frontend calendar display (user's local timezone)
          const dateKey = getLocalDateKey(displayDate);
          
          if (!calendarMap[dateKey]) {
            calendarMap[dateKey] = [];
          }
          
          // Check if already added to avoid duplicates
          const alreadyInMap = calendarMap[dateKey].some(o => o.id === order.id);
          if (!alreadyInMap && calendarMap[dateKey].length < limit) {
            calendarMap[dateKey].push(orderSummary);
          }
        }
      }

      // Convert to calendar array format
      const calendar: CalendarDay[] = [];
      let totalPickups = 0;
      let totalReturns = 0;

      for (const [dateKey, dayOrders] of Object.entries(calendarMap)) {
        const dayRevenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        
        // All orders in calendarMap are RESERVED orders only (đơn đã cọc)
        // RESERVED: hiển thị theo pickupPlanAt (ngày dự kiến lấy)
        const dayPickups = dayOrders.length;
        const dayReturns = 0; // No return orders displayed
        
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

        totalPickups += dayPickups;
        totalReturns += dayReturns;
      }

      // Calculate unique orders and total revenue to avoid double counting
      const allUniqueOrders = new Map();
      calendar.forEach(day => {
        day.orders.forEach(order => {
          // Store order with its revenue only once
          if (!allUniqueOrders.has(order.id)) {
            allUniqueOrders.set(order.id, order.totalAmount);
          }
        });
      });

      const totalOrders = allUniqueOrders.size;
      const totalRevenue = Array.from(allUniqueOrders.values()).reduce((sum, revenue) => sum + revenue, 0);

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
        code: 'CALENDAR_DATA_SUCCESS',
        message: `Calendar data for ${startDateStr} to ${endDateStr}`
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
      code: 'NO_CALENDAR_DATA',
      message: `No calendar data for ${startDateStr} to ${endDateStr}`
    });

  } catch (error) {
    console.error('❌ Calendar API error:', error);
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
