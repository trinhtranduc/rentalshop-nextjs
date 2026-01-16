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
 * Authorization: Roles with 'analytics.view.revenue' or 'analytics.view.revenue.daily' permission can access
 * - ADMIN, MERCHANT, OUTLET_ADMIN: Can view revenue analytics (analytics.view.revenue)
 * - OUTLET_STAFF: Can view daily income analytics only (analytics.view.revenue.daily)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['analytics.view.revenue', 'analytics.view.revenue.daily'])(async (request, { user, userScope }) => {
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
    // Include orders that have ANY activity (create, status change, update) in the date range
    const whereClause: any = {
      OR: [
        // Orders created in the range (MOST IMPORTANT - ensures orders appear even after updates)
        {
          createdAt: {
            gte: start,
            lte: end
          }
        },
        // Orders picked up in the range (status change to PICKUPED)
        {
          pickedUpAt: {
            gte: start,
            lte: end,
            not: null
          }
        },
        // Orders returned in the range (status change to RETURNED)
        {
          returnedAt: {
            gte: start,
            lte: end,
            not: null
          }
        },
        // Orders cancelled in the range (status change to CANCELLED)
        // Use updatedAt when status is CANCELLED and cancelled happened in the range
        {
          AND: [
            {
              status: ORDER_STATUS.CANCELLED
            },
            {
              updatedAt: {
                gte: start,
                lte: end
              }
            },
            // Exclude soft-deleted orders
            {
              deletedAt: null
            }
          ]
        },
        // Orders completed in the range (SALE orders - status change to COMPLETED)
        {
          AND: [
            {
              orderType: ORDER_TYPE.SALE
            },
            {
              status: ORDER_STATUS.COMPLETED
            },
            {
              updatedAt: {
                gte: start,
                lte: end
              }
            },
            {
              deletedAt: null
            }
          ]
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
        updatedAt: true, // Include updatedAt to track status changes
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
     * Generate revenue events based on TIMESTAMPS in the date range
     * Each event represents revenue collected/refunded on a specific day
     * 
     * Logic matches order detail page:
     * - RESERVED: depositAmount (collected when order created)
     * - PICKUPED: totalAmount - depositAmount + securityDeposit (collected when picked up)
     * - RETURNED: damageFee - securityDeposit (positive = collect more, negative = refund)
     * - CANCELLED: negative revenue (refund based on what was collected)
     * 
     * IMPORTANT: Track events by timestamp, not current status
     * This ensures orders appear on the correct day they were created/updated
     */
    const getOrderRevenueEvents = (order: any, dateRangeStart: Date, dateRangeEnd: Date): Array<{
      revenue: number;
      date: Date;
      description: string;
      revenueType: string;
    }> => {
      const events: Array<{ revenue: number; date: Date; description: string; revenueType: string }> = [];

      if (order.orderType === ORDER_TYPE.SALE) {
        // SALE orders: revenue is totalAmount on createdAt date IF created in range
        if (order.createdAt) {
          const createdDate = new Date(order.createdAt);
          if (createdDate >= dateRangeStart && createdDate <= dateRangeEnd) {
            // Only count if order was created in the range AND not cancelled at creation
            const wasCancelledAtCreation = order.status === ORDER_STATUS.CANCELLED && 
              (!order.updatedAt || new Date(order.updatedAt).getTime() === createdDate.getTime());
            
            if (!wasCancelledAtCreation) {
              events.push({
                revenue: order.totalAmount || 0,
                date: createdDate,
                description: 'Sale order created',
                revenueType: 'SALE'
              });
            }
          }
        }

        // SALE order cancellation: create negative event to offset revenue (ensure total revenue = 0)
        if (order.status === ORDER_STATUS.CANCELLED && order.updatedAt) {
          const cancelledDate = new Date(order.updatedAt);
          if (cancelledDate >= dateRangeStart && cancelledDate <= dateRangeEnd) {
            const createdDate = order.createdAt ? new Date(order.createdAt) : null;
            if (createdDate && createdDate < cancelledDate) {
              // Order was created before being cancelled, create negative event to offset
              events.push({
                revenue: -(order.totalAmount || 0),
                date: cancelledDate,
                description: 'Sale order cancelled (revenue offset to 0)',
                revenueType: 'SALE_CANCELLED'
              });
            }
          }
        }
      } else {
        // RENT orders: track events by timestamp
        
        // 1. RESERVED: Deposit collected when order is CREATED (createdAt within range)
        if (order.createdAt) {
          const createdDate = new Date(order.createdAt);
          if (createdDate >= dateRangeStart && createdDate <= dateRangeEnd) {
            // Check if order was cancelled at creation time
            const wasCancelledAtCreation = order.status === ORDER_STATUS.CANCELLED && 
              (!order.updatedAt || new Date(order.updatedAt).getTime() === createdDate.getTime());
            
            if (!wasCancelledAtCreation) {
              // Order created (RESERVED status): revenue is depositAmount (tiền cọc)
              // If depositAmount = 0, revenue = 0 (chưa thu tiền cọc)
              // If depositAmount > 0, revenue = depositAmount (đã thu tiền cọc)
              events.push({
                revenue: order.depositAmount || 0,
                date: createdDate,
                description: 'Rental deposit collected',
                revenueType: 'RENT_DEPOSIT'
              });
            }
          }
        }

        // 2. PICKUPED: Additional payment when order is PICKED UP (pickedUpAt within range)
        // Revenue = totalAmount - depositAmount + securityDeposit
        if (order.pickedUpAt) {
          const pickupDate = new Date(order.pickedUpAt);
          if (pickupDate >= dateRangeStart && pickupDate <= dateRangeEnd) {
            // Calculate pickup revenue: total - deposit + security deposit
            const pickupRevenue = (order.totalAmount || 0) - (order.depositAmount || 0) + (order.securityDeposit || 0);
            // Always create event, even if revenue = 0, to ensure order appears
            events.push({
              revenue: pickupRevenue,
              date: pickupDate,
              description: 'Rental pickup payment',
              revenueType: 'RENT_PICKUP'
            });
          }
        }

        // 3. RETURNED: Final settlement when order is RETURNED (returnedAt within range)
        // Revenue = damageFee - securityDeposit (positive = collect more, negative = refund)
        if (order.returnedAt) {
          const returnDate = new Date(order.returnedAt);
          if (returnDate >= dateRangeStart && returnDate <= dateRangeEnd) {
            // Calculate return revenue: damageFee - securityDeposit
            const returnRevenue = (order.damageFee || 0) - (order.securityDeposit || 0);
            // Always create event, even if revenue = 0, to ensure order appears
            events.push({
              revenue: returnRevenue,
              date: returnDate,
              description: returnRevenue > 0 
                ? 'Rental return (damage fee)' 
                : returnRevenue < 0 
                  ? 'Rental return (security deposit refund)' 
                  : 'Rental return (no additional fee)',
              revenueType: 'RENT_RETURN'
            });
          }
        }

        // 4. CANCELLED: Create negative events to offset revenue (ensure total revenue = 0)
        if (order.status === ORDER_STATUS.CANCELLED && order.updatedAt) {
          const cancelledDate = new Date(order.updatedAt);
          if (cancelledDate >= dateRangeStart && cancelledDate <= dateRangeEnd) {
            const createdDate = order.createdAt ? new Date(order.createdAt) : null;
            const pickupDate = order.pickedUpAt ? new Date(order.pickedUpAt) : null;
            
            // Calculate total revenue collected before cancellation to offset
            let totalCollected = 0;
            
            if (pickupDate && pickupDate < cancelledDate) {
              // Order was picked up: collected deposit + pickup payment
              totalCollected = (order.depositAmount || 0) + 
                              ((order.totalAmount || 0) - (order.depositAmount || 0) + (order.securityDeposit || 0));
            } else if (createdDate && createdDate < cancelledDate) {
              // Order was only reserved: collected deposit only
              totalCollected = order.depositAmount || 0;
            }
            
            // Create negative event to offset all collected revenue
            if (totalCollected !== 0) {
              events.push({
                revenue: -totalCollected,
                date: cancelledDate,
                description: 'Rental order cancelled (revenue offset to 0)',
                revenueType: 'RENT_CANCELLED'
              });
            }
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
      // Get all revenue events for this order based on actual timestamps in the range
      const revenueEvents = getOrderRevenueEvents(order, start, end);

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
      // Count ALL orders created in the range, regardless of current status
      // because an order created today should be counted even if later picked up/returned/cancelled
      if (order.createdAt) {
        const createdDate = new Date(order.createdAt);
        if (createdDate >= start && createdDate <= end) {
          const dateKey = getUTCDateKey(createdDate); // Use utility for YYYY/MM/DD format
          const orderKey = `${order.orderNumber}-${dateKey}`;
          
          // Only count once per order per day
          if (!newOrdersCounted.has(orderKey)) {
            if (dailyDataMap.has(dateKey)) {
              const dailyData = dailyDataMap.get(dateKey)!;
              // Count ALL orders created in the range (SALE or RENT)
              // Don't check status because order might have been updated later
              if (order.orderType === ORDER_TYPE.SALE) {
                // SALE orders count as new if created (and not cancelled at creation)
                if (order.status !== ORDER_STATUS.CANCELLED || 
                    (order.updatedAt && new Date(order.updatedAt) > createdDate)) {
                  // Not cancelled at creation, or cancelled later
                  dailyData.newOrderCount += 1;
                  newOrdersCounted.add(orderKey);
                }
              } else {
                // RENT orders count as new if created (deposit collected or not)
                // Only exclude if cancelled immediately at creation
                if (order.status !== ORDER_STATUS.CANCELLED || 
                    (order.updatedAt && new Date(order.updatedAt) > createdDate)) {
                  // Not cancelled at creation, or cancelled later
                  dailyData.newOrderCount += 1;
                  newOrdersCounted.add(orderKey);
                }
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
