import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ORDER_STATUS, ORDER_TYPE, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, normalizeDateToISO, getUTCDateKey, calculatePeriodRevenueBatch } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/income - Get income analytics
 * 
 * Authorization: Roles with 'analytics.view.revenue' permission can access
 * - ADMIN, MERCHANT, OUTLET_ADMIN: Can view revenue analytics
 * - OUTLET_STAFF: Cannot access (dashboard only)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['analytics.view.revenue'])(async (request, { user, userScope }) => {
  console.log(`💰 GET /api/analytics/income - User: ${user.email}`);
  
  try {

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'month';
    const outletIdsParam = searchParams.get('outletIds'); // Comma-separated outlet IDs for comparison

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Parse outletIds if provided (for MERCHANT comparison mode)
    let selectedOutletIds: number[] | null = null;
    if (outletIdsParam && user.role === USER_ROLE.MERCHANT && userScope.merchantId) {
      try {
        selectedOutletIds = outletIdsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        if (selectedOutletIds.length === 0) {
          selectedOutletIds = null;
        }
      } catch (error) {
        console.error('Error parsing outletIds:', error);
        selectedOutletIds = null;
      }
    }

    // Generate data based on groupBy parameter
    const incomeData: any[] = [];
    
    // Helper function to get outlet IDs based on selected outlets or user scope
    const getOutletsToProcess = async () => {
      if (selectedOutletIds && user.role === USER_ROLE.MERCHANT && userScope.merchantId) {
        // Get outlet info for selected outlets
        const outlets = await Promise.all(
          selectedOutletIds.map(async (outletId) => {
            try {
              const outlet = await db.outlets.findById(outletId);
              return outlet ? { id: outlet.id, publicId: outletId, name: outlet.name } : null;
            } catch (error) {
              console.error(`Error fetching outlet ${outletId}:`, error);
              return null;
            }
          })
        );
        return outlets.filter((o) => o !== null) as Array<{ id: string | number; publicId: number; name: string }>;
        }

      // Default behavior: get all merchant outlets or single outlet
        if (userScope.merchantId) {
          const merchant = await db.merchants.findById(userScope.merchantId);
          if (merchant && merchant.outlets) {
          return merchant.outlets.map((outlet: any) => ({
            id: outlet.id,
            publicId: outlet.publicId || outlet.id,
            name: outlet.name
          }));
          }
        } else if (userScope.outletId) {
        const outlet = await db.outlets.findById(userScope.outletId);
          if (outlet) {
          return [{
            id: outlet.id,
            publicId: userScope.outletId,
            name: outlet.name
          }];
          }
        }
      return [];
    };

    const outletsToProcess = await getOutletsToProcess();

    // Helper function to process income data for a specific outlet
    const processOutletIncome = async (outlet: { id: string | number; publicId: number; name: string } | null, startOfPeriod: Date, endOfPeriod: Date, periodLabel: string, year: number, groupByType: 'month' | 'day') => {
      // Build where clause for orders
      const orderWhereClause: any = {
        createdAt: {
          gte: startOfPeriod,
          lte: endOfPeriod,
        }
      };

      // Apply outlet filtering
      if (outlet) {
        orderWhereClause.outletId = outlet.id;
      } else if (userScope.merchantId && !selectedOutletIds) {
        // Aggregate all merchant outlets (default behavior when no outletIds specified)
        const merchant = await db.merchants.findById(userScope.merchantId);
        if (merchant && merchant.outlets) {
          orderWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
        }
      } else if (userScope.outletId) {
        const outletObj = await db.outlets.findById(userScope.outletId);
        if (outletObj) {
          orderWhereClause.outletId = outletObj.id;
        }
      }

      // Build outlet filter for all queries
      const outletFilter: any = {};
      if (outlet) {
        outletFilter.outletId = outlet.id;
      } else if (userScope.merchantId && !selectedOutletIds) {
        const merchant = await db.merchants.findById(userScope.merchantId);
        if (merchant && merchant.outlets) {
          outletFilter.outletId = { in: merchant.outlets.map((o: any) => o.id) };
        }
      } else if (userScope.outletId) {
        const outletObj = await db.outlets.findById(userScope.outletId);
        if (outletObj) {
          outletFilter.outletId = outletObj.id;
        }
      }

      // Calculate income using getOrderRevenueForDate (single source of truth)
      // Query all orders that have events or future plans in this period
      const ordersWhereClause: any = {
        OR: [
          // Orders created in period
          { createdAt: { gte: startOfPeriod, lte: endOfPeriod } },
          // Orders picked up in period
          { pickedUpAt: { gte: startOfPeriod, lte: endOfPeriod } },
          // Orders returned in period
          { returnedAt: { gte: startOfPeriod, lte: endOfPeriod } },
          // Orders cancelled in period
          { updatedAt: { gte: startOfPeriod, lte: endOfPeriod }, status: ORDER_STATUS.CANCELLED as any },
          // Orders with future pickup plan in period
          { pickupPlanAt: { gte: startOfPeriod, lte: endOfPeriod } },
          // Orders with future return plan in period
          { returnPlanAt: { gte: startOfPeriod, lte: endOfPeriod } }
        ]
      };

      // Apply outlet filtering
      if (outlet) {
        ordersWhereClause.outletId = outlet.id;
      } else if (userScope.merchantId && !selectedOutletIds) {
        const merchant = await db.merchants.findById(userScope.merchantId);
        if (merchant && merchant.outlets) {
          ordersWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
        }
      } else if (userScope.outletId) {
        const outletObj = await db.outlets.findById(userScope.outletId);
        if (outletObj) {
          ordersWhereClause.outletId = outletObj.id;
        }
      }

      // Query all relevant orders using db API to get all fields including securityDeposit and damageFee
      // Use findManyLightweight which includes securityDeposit and damageFee
      const allOrdersResult = await db.orders.findManyLightweight({
        ...(outlet ? { outletId: typeof outlet.id === 'string' ? parseInt(outlet.id as any) : outlet.id } : {}),
        ...(userScope.merchantId && !selectedOutletIds ? { merchantId: userScope.merchantId } : {}),
        ...(userScope.outletId && !outlet ? { outletId: userScope.outletId } : {}),
        startDate: startOfPeriod,
        endDate: endOfPeriod,
        limit: 10000 // Large limit to get all orders
      });

      // Filter orders based on OR conditions (createdAt, pickedUpAt, returnedAt, etc.)
      const allOrders = allOrdersResult.data.filter((order: any) => {
        const orderCreatedAt = order.createdAt ? new Date(order.createdAt) : null;
        const orderPickedUpAt = order.pickedUpAt ? new Date(order.pickedUpAt) : null;
        const orderReturnedAt = order.returnedAt ? new Date(order.returnedAt) : null;
        const orderUpdatedAt = order.updatedAt ? new Date(order.updatedAt) : null;
        const orderPickupPlanAt = order.pickupPlanAt ? new Date(order.pickupPlanAt) : null;
        const orderReturnPlanAt = order.returnPlanAt ? new Date(order.returnPlanAt) : null;

        return (
          // Created in period
          (orderCreatedAt && orderCreatedAt >= startOfPeriod && orderCreatedAt <= endOfPeriod) ||
          // Picked up in period
          (orderPickedUpAt && orderPickedUpAt >= startOfPeriod && orderPickedUpAt <= endOfPeriod) ||
          // Returned in period
          (orderReturnedAt && orderReturnedAt >= startOfPeriod && orderReturnedAt <= endOfPeriod) ||
          // Cancelled in period
          (order.status === ORDER_STATUS.CANCELLED && orderUpdatedAt && orderUpdatedAt >= startOfPeriod && orderUpdatedAt <= endOfPeriod) ||
          // Future pickup plan in period
          (orderPickupPlanAt && orderPickupPlanAt >= startOfPeriod && orderPickupPlanAt <= endOfPeriod) ||
          // Future return plan in period
          (orderReturnPlanAt && orderReturnPlanAt >= startOfPeriod && orderReturnPlanAt <= endOfPeriod)
        );
      });

      // Calculate revenue using calculatePeriodRevenueBatch (single source of truth)
      // Prepare order data for revenue calculator
      const ordersData = allOrders.map((order: any) => ({
        orderType: order.orderType,
        status: order.status,
        totalAmount: order.totalAmount || 0,
        depositAmount: order.depositAmount || 0,
        securityDeposit: order.securityDeposit || 0,
        damageFee: order.damageFee || 0,
        createdAt: order.createdAt,
        pickedUpAt: order.pickedUpAt,
        returnedAt: order.returnedAt,
        pickupPlanAt: order.pickupPlanAt,
        returnPlanAt: order.returnPlanAt,
        updatedAt: order.updatedAt
      }));

      // Calculate period revenue for all orders (batch processing)
      const { realIncome, futureIncome } = calculatePeriodRevenueBatch(
        ordersData,
        startOfPeriod,
        endOfPeriod
      );

      // Get order count for the period
        const orderCount = await db.orders.getStats({
          where: {
            createdAt: {
            gte: startOfPeriod,
            lte: endOfPeriod
            },
            status: { in: [ORDER_STATUS.RESERVED as any, ORDER_STATUS.PICKUPED as any, ORDER_STATUS.COMPLETED as any] },
            ...orderWhereClause
          }
        });

      // Normalize startOfPeriod to midnight UTC for consistent ISO formatting (use utility)
      const dateKey = getUTCDateKey(startOfPeriod); // YYYY/MM/DD format
      const dateISO = normalizeDateToISO(startOfPeriod); // Full ISO string at midnight UTC
      const normalizedStartOfPeriod = new Date(dateISO);

      // Push data with outlet info if outlet comparison is enabled
      const dataPoint: any = {
        // Keep periodLabel for backward compatibility (display format)
        month: groupByType === 'month' ? periodLabel : `${periodLabel}`,
        // Add ISO date fields for mobile locale formatting (using utilities)
        date: groupByType === 'day' ? dateKey : undefined, // YYYY/MM/DD for day only
        dateISO: dateISO, // Full ISO string at midnight UTC for locale formatting
        year: year,
        monthNumber: groupByType === 'month' ? normalizedStartOfPeriod.getUTCMonth() + 1 : undefined, // 1-12
        dayNumber: groupByType === 'day' ? normalizedStartOfPeriod.getUTCDate() : undefined, // 1-31
        realIncome: realIncome,
        futureIncome: futureIncome,
        orderCount: orderCount
      };

      // Add outlet info when outletIds parameter is provided
      if (outlet) {
        dataPoint.outletId = outlet.publicId;
        dataPoint.outletName = outlet.name;
      }

      incomeData.push(dataPoint);
    };
    
    if (groupBy === 'month') {
      // Generate monthly data
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      
      while (current <= endMonth) {
        const year = current.getFullYear();
        const month = current.getMonth();
        
        // Format as mm/yy (e.g., "11/25")
        const monthStr = String(month + 1).padStart(2, '0');
        const yearStr = String(year).slice(-2); // Last 2 digits of year
        const periodLabel = `${monthStr}/${yearStr}`;
        
        // Calculate start and end of month
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

        // Process each outlet separately if outletIds provided, otherwise process aggregated
        if (selectedOutletIds && outletsToProcess.length > 0) {
          // Process each outlet separately for comparison
          for (const outlet of outletsToProcess) {
            await processOutletIncome(outlet, startOfMonth, endOfMonth, periodLabel, year, 'month');
          }
        } else {
          // Default behavior: aggregate all outlets (or single outlet for outlet users)
          await processOutletIncome(null, startOfMonth, endOfMonth, periodLabel, year, 'month');
        }

        // Move to next month
        current.setMonth(current.getMonth() + 1);
      }
    } else if (groupBy === 'day') {
      // Generate daily data
      const current = new Date(start);
      const endDay = new Date(end);
      
      while (current <= endDay) {
        const year = current.getFullYear();
        const month = current.getMonth();
        const day = current.getDate();
        
        // Format as dd/mm/yy (e.g., "21/11/25")
        const dayStr = String(day).padStart(2, '0');
        const monthStr = String(month + 1).padStart(2, '0');
        const yearStr = String(year).slice(-2); // Last 2 digits of year
        const periodLabel = `${dayStr}/${monthStr}/${yearStr}`;
        
        // Calculate start and end of day
        const startOfDay = new Date(year, month, day, 0, 0, 0);
        const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

        // Process each outlet separately if outletIds provided, otherwise process aggregated
        if (selectedOutletIds && outletsToProcess.length > 0) {
          // Process each outlet separately for comparison
          for (const outlet of outletsToProcess) {
            await processOutletIncome(outlet, startOfDay, endOfDay, periodLabel, year, 'day');
          }
        } else {
          // Default behavior: aggregate all outlets (or single outlet for outlet users)
          await processOutletIncome(null, startOfDay, endOfDay, periodLabel, year, 'day');
        }

        // Move to next day
        current.setDate(current.getDate() + 1);
      }
    }

    const responseData = ResponseBuilder.success('INCOME_ANALYTICS_SUCCESS', incomeData);
    const dataString = JSON.stringify(responseData);
    const etag = crypto.createHash('sha1').update(dataString).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return NextResponse.json(responseData, { status: API.STATUS.OK, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching income analytics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';
