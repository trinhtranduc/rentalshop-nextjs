import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { z } from 'zod';
import { getTenantDbFromRequest, handleApiError, getUTCDateKey, ResponseBuilder } from '@rentalshop/utils';
import type { CalendarOrderSummary, DayOrders, CalendarResponse, CalendarDay } from '@rentalshop/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Validation schema for calendar orders query
const calendarOrdersQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  outletId: z.coerce.number().int().positive().optional(),
  status: z.enum(['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED']).optional(),
  orderType: z.enum(['RENT', 'SALE']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10), // Max 50 orders per day
});

// Types are now imported from @rentalshop/utils

/**
 * 🎯 Calendar Orders API
 * MULTI-TENANT: Uses subdomain-based tenant DB
 * 
 * Returns order counts and summaries for calendar display
 * - Groups orders by date
 * - Separates pickups and returns
 * - Limits to 3-4 orders per day for performance
 * - Optimized for calendar UI
 */
export const GET = withManagementAuth(async (
  request: NextRequest,
  { user }
) => {
  console.log(`🔍 GET /api/calendar/orders - User: ${user.email} (${user.role})`);

  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());
    const validatedQuery = calendarOrdersQuerySchema.parse(query);

    console.log('📅 Calendar query:', validatedQuery);

    const { startDate: startDateStr, endDate: endDateStr, outletId, status, orderType, limit } = validatedQuery;

    // Parse date strings
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    console.log('📅 Date range:', { startDate, endDate });

    // Build where clause with role-based filtering
    // Calendar should show orders by pickup date, not return date
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
      where.orderType = 'RENT';
    }
    
    if (status) {
      where.status = status;
    } else {
      // Default to only active pickup orders (not returned)
      where.status = {
        in: ['RESERVED', 'PICKUPED']
      };
    }

    // Role-based filtering - NO merchantId needed, DB is isolated
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      // OUTLET users: Can only see orders from their assigned outlet
      if (user.outletId) {
        where.outletId = user.outletId;
      }
    } else if (outletId) {
      // Optional outlet filtering for admin-level users
      where.outletId = outletId;
    }

    console.log('🔍 Calendar where clause:', where);

    // Fetch orders for the month with orderItems included
    const orders = await db.order.findMany({
      where,
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        outlet: {
          select: {
            name: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                images: true,
                rentPrice: true,
                deposit: true
              }
            }
          }
        }
      },
      take: 1000 // Get all orders for the month
    });

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

        // Add order only to pickup date (RESERVED and PICKUPED orders only)
        if (order.pickupPlanAt) {
          const pickupDate = new Date(order.pickupPlanAt);
          const pickupDateKey = getUTCDateKey(pickupDate);
          
          if (!calendarMap[pickupDateKey]) {
            calendarMap[pickupDateKey] = [];
          }
          
          // Check if already added to avoid duplicates
          const alreadyInMap = calendarMap[pickupDateKey].some(o => o.id === order.id);
          if (!alreadyInMap && calendarMap[pickupDateKey].length < limit) {
            calendarMap[pickupDateKey].push(orderSummary);
          }
        }
      }

      // Convert to calendar array format
      const calendar: CalendarDay[] = [];
      let totalPickups = 0;
      let totalReturns = 0;

      for (const [dateKey, dayOrders] of Object.entries(calendarMap)) {
        const dayRevenue = dayOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        
        // All orders in calendarMap are pickup orders only (RESERVED and PICKUPED)
        // Orders are only added to their pickup date
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

      return NextResponse.json(
        ResponseBuilder.success('CALENDAR_DATA_SUCCESS', {
          ...calendarData,
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
          }
        })
      );
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

    return NextResponse.json(
      ResponseBuilder.success('NO_CALENDAR_DATA', {
        ...emptyCalendarData,
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
        }
      })
    );

  } catch (error) {
    console.error('❌ Calendar API error:', error);
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
