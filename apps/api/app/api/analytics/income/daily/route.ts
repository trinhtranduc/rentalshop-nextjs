import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import { ORDER_STATUS, ORDER_TYPE, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, normalizeDateToISO, getUTCDateKey } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/income/daily - Get daily income with order breakdown
 * Returns income grouped by day with detailed order information
 * 
 * For each day, shows:
 * - Total revenue for that day
 * - List of orders with their individual revenue contributions
 * - Number of new orders created that day
 * 
 * Authorization: Roles with 'analytics.view.revenue' permission can access
 * - ADMIN, MERCHANT, OUTLET_ADMIN: Can view revenue analytics
 * - OUTLET_STAFF: Cannot access (dashboard only)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['analytics.view.revenue'])(async (request, { user, userScope }) => {
  console.log(`💰 GET /api/analytics/income/daily - User: ${user.email}`);
  
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        ResponseBuilder.error('MISSING_REQUIRED_FIELD'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Set time to end of day for end date
    end.setHours(23, 59, 59, 999);
    
    // Validate date range
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_DATE_FORMAT'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    if (start > end) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_INPUT'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // Build outlet filter based on user scope
    const whereClause: any = {
      OR: [
        // Orders created in the range
        {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        // Orders picked up in the range
        {
          pickedUpAt: {
            gte: start,
            lte: end
          }
        },
        // Orders returned in the range
        {
          returnedAt: {
            gte: start,
            lte: end
          }
        }
      ]
    };

    // Apply outlet filtering based on user role
    if (userScope.outletId) {
      // id in Prisma is the integer publicId
      whereClause.outletId = userScope.outletId;
    } else if (userScope.merchantId) {
      // Find merchant's outlets
      const merchant = await prisma.merchant.findUnique({
        where: { id: userScope.merchantId },
        select: {
          outlets: {
            select: { id: true }
          }
        }
      });
      if (merchant && merchant.outlets.length > 0) {
        whereClause.outletId = { in: merchant.outlets.map((o: { id: number }) => o.id) };
      }
    }
    // ADMIN users have no outlet filter (see all data)

    // Fetch all orders that might contribute to revenue in the date range
    const allOrders = await prisma.order.findMany({
      where: whereClause,
      select: {
        id: true, // id is the integer publicId
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        securityDeposit: true,
        damageFee: true,
        createdAt: true,
        pickedUpAt: true,
        returnedAt: true,
        customer: {
          select: {
            id: true, // id is the integer publicId
            firstName: true,
            lastName: true,
            phone: true
          }
        },
        outlet: {
          select: {
            id: true, // id is the integer publicId
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    /**
     * Generate revenue events for a single order
     * A RENT order can have multiple revenue events on different days:
     * - Deposit on creation (RESERVED)
     * - Pickup payment when picked up (PICKUPED)
     * - Return refund/fee when returned (RETURNED)
     */
    const getOrderRevenueEvents = (order: any): Array<{
      revenue: number;
      date: Date;
      description: string;
      revenueType: string;
    }> => {
      const events: Array<{ revenue: number; date: Date; description: string; revenueType: string }> = [];

      if (order.orderType === ORDER_TYPE.SALE) {
        // SALE orders: revenue is totalAmount on createdAt date
        if (order.createdAt) {
          events.push({
            revenue: order.totalAmount || 0,
            date: new Date(order.createdAt),
            description: 'Sale order',
            revenueType: 'SALE'
          });
        }
      } else {
        // RENT orders: multiple possible revenue events
        
        // 1. Deposit when order is created (RESERVED status)
        if (order.status === ORDER_STATUS.RESERVED && order.createdAt && order.depositAmount) {
          events.push({
            revenue: order.depositAmount,
            date: new Date(order.createdAt),
            description: 'Rental deposit',
            revenueType: 'RENT_DEPOSIT'
          });
        }

        // 2. Pickup payment when order is picked up (PICKUPED status)
        if (order.status === ORDER_STATUS.PICKUPED && order.pickedUpAt) {
          const pickupRevenue = (order.totalAmount || 0) - (order.depositAmount || 0) + (order.securityDeposit || 0);
          events.push({
            revenue: pickupRevenue,
            date: new Date(order.pickedUpAt),
            description: 'Rental pickup payment',
            revenueType: 'RENT_PICKUP'
          });
        }

        // 3. Return refund/fee when order is returned (RETURNED status)
        if (order.status === ORDER_STATUS.RETURNED && order.returnedAt) {
          const pickupDate = order.pickedUpAt ? new Date(order.pickedUpAt) : null;
          const returnDate = new Date(order.returnedAt);
          
          if (pickupDate && pickupDate.toDateString() === returnDate.toDateString()) {
            // Same day rental: total - security deposit + damage fee
            const revenue = (order.totalAmount || 0) - (order.securityDeposit || 0) + (order.damageFee || 0);
            events.push({
              revenue,
              date: returnDate,
              description: 'Same-day rental return',
              revenueType: 'RENT_RETURN_SAME_DAY'
            });
          } else {
            // Different days: security deposit - damage fee (negative = refund to customer)
            const refund = (order.securityDeposit || 0) - (order.damageFee || 0);
            events.push({
              revenue: -refund, // Negative because we return money to customer
              date: returnDate,
              description: refund > 0 ? `Security deposit refund` : `Damage fee`,
              revenueType: 'RENT_RETURN'
            });
          }
        }
      }

      return events;
    };

    // Group orders by day and calculate revenue
    const dailyDataMap = new Map<string, {
      date: string; // ISO string for date (YYYY-MM-DD) - frontend can format with locale
      dateISO: string; // Full ISO string at midnight UTC for the day
      dateObj: Date;
      totalRevenue: number;
      newOrderCount: number;
      orders: Array<{
        id: number;
        orderNumber: string;
        orderType: string;
        status: string;
        revenue: number;
        revenueType: string;
        description: string;
        revenueDate: string; // ISO string with full timestamp
        customerName?: string;
        customerPhone?: string;
        outletName?: string;
        totalAmount: number;
        depositAmount: number;
      }>;
    }>();

    // Track which orders have been counted as "new orders" to avoid double counting
    const newOrdersCounted = new Set<string>();

    // Process each order
    for (const order of allOrders) {
      // Get all revenue events for this order
      const revenueEvents = getOrderRevenueEvents(order);

      // Process each revenue event
      for (const event of revenueEvents) {
        // Only include if revenue date is within the range
        if (event.date < start || event.date > end) {
          continue;
        }

        // Format date as YYYY/MM/DD for grouping (use utility)
        const dateKey = getUTCDateKey(event.date);
        // Normalize date to midnight UTC ISO string (use utility)
        const dateISO = normalizeDateToISO(event.date);
        const dateObj = new Date(dateISO);

        // Get or create daily entry
        if (!dailyDataMap.has(dateKey)) {
          dailyDataMap.set(dateKey, {
            date: dateKey, // YYYY/MM/DD format (standardized)
            dateISO: dateISO, // Full ISO string for frontend formatting (from utility)
            dateObj,
            totalRevenue: 0,
            newOrderCount: 0,
            orders: []
          });
        }

        const dailyData = dailyDataMap.get(dateKey)!;

        // Add order revenue
        dailyData.totalRevenue += event.revenue;

        // Add order to list
        const customerName = order.customer 
          ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
          : undefined;
        
        dailyData.orders.push({
          id: order.id, // id is already the integer publicId
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          status: order.status,
          revenue: event.revenue,
          revenueType: event.revenueType,
          description: event.description,
          revenueDate: event.date.toISOString(),
          customerName,
          customerPhone: order.customer?.phone || undefined,
          outletName: order.outlet?.name,
          totalAmount: order.totalAmount || 0,
          depositAmount: order.depositAmount || 0
        });
      }

      // Count new orders (created on any day in the range)
      if (order.createdAt) {
        const createdDate = new Date(order.createdAt);
        if (createdDate >= start && createdDate <= end) {
          const dateKey = getUTCDateKey(createdDate); // Use utility for YYYY/MM/DD format
          const orderKey = `${order.orderNumber}-${dateKey}`;
          
          // Only count once per order per day
          if (!newOrdersCounted.has(orderKey)) {
            if (dailyDataMap.has(dateKey)) {
              const dailyData = dailyDataMap.get(dateKey)!;
              // Only count as new order if it's a sale or a reserved rental (deposit collected)
              if (order.orderType === ORDER_TYPE.SALE || 
                  (order.orderType === ORDER_TYPE.RENT && order.status === ORDER_STATUS.RESERVED)) {
                dailyData.newOrderCount += 1;
                newOrdersCounted.add(orderKey);
              }
            }
          }
        }
      }
    }

    // Convert map to array and sort by date
    const dailyDataArray = Array.from(dailyDataMap.values())
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(({ dateObj, ...rest }) => ({
        ...rest,
        // Ensure date and dateISO are both included for frontend flexibility
        // date: YYYY/MM/DD format (standardized)
        // dateISO: Full ISO string at midnight UTC (for locale formatting)
      }));

    return NextResponse.json(
      ResponseBuilder.success('DAILY_INCOME_SUCCESS', {
        startDate: startDate,
        endDate: endDate,
        days: dailyDataArray,
        summary: {
          totalDays: dailyDataArray.length,
          totalRevenue: dailyDataArray.reduce((sum, day) => sum + day.totalRevenue, 0),
          totalNewOrders: dailyDataArray.reduce((sum, day) => sum + day.newOrderCount, 0),
          totalOrders: dailyDataArray.reduce((sum, day) => sum + day.orders.length, 0)
        }
      })
    );

  } catch (error) {
    console.error('Error fetching daily income:', error);
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';
