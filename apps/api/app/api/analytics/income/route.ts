import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ORDER_STATUS, ORDER_TYPE } from '@rentalshop/constants';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/income - Get income analytics
 * REFACTORED: Now uses unified withAuthRoles pattern
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
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
    if (outletIdsParam && user.role === 'MERCHANT' && userScope.merchantId) {
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
    const incomeData = [];
    
    // Helper function to get outlet IDs based on selected outlets or user scope
    const getOutletsToProcess = async () => {
      if (selectedOutletIds && user.role === 'MERCHANT' && userScope.merchantId) {
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
        return outlets.filter((o): o is { id: string; publicId: number; name: string } => o !== null);
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

    // Helper function to calculate revenue for an order
        const calculateOrderRevenue = (order: any) => {
          if (order.orderType === ORDER_TYPE.SALE) {
            return order.totalAmount;
          } else {
            // RENT order
            if (order.status === ORDER_STATUS.RESERVED) {
              return order.depositAmount;
            } else if (order.status === ORDER_STATUS.PICKUPED) {
              return order.totalAmount - order.depositAmount + (order.securityDeposit || 0);
            } else if (order.status === ORDER_STATUS.RETURNED) {
              // Check if order was picked up and returned on the same day
              const pickupDate = order.pickedUpAt ? new Date(order.pickedUpAt) : null;
              const returnDate = order.returnedAt ? new Date(order.returnedAt) : null;
              
              if (pickupDate && returnDate) {
                const sameDay = pickupDate.toDateString() === returnDate.toDateString();
                if (sameDay) {
                  // Same day rental: total - security deposit + damage fee
                  return order.totalAmount - (order.securityDeposit || 0) + (order.damageFee || 0);
                }
              }
              
              // Different days or no pickup/return dates: security deposit - damage fee
              return (order.securityDeposit || 0) - (order.damageFee || 0);
            }
          }
          return 0;
        };

    // Helper function to process income data for a specific outlet
    const processOutletIncome = async (outlet: { id: string; publicId: number; name: string } | null, startOfPeriod: Date, endOfPeriod: Date, periodLabel: string, year: number, groupByType: 'month' | 'day') => {
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

      // Get orders for revenue calculation
      const ordersForRevenueResult = await db.orders.search({
        where: orderWhereClause,
        select: {
          id: true,
          orderType: true,
          status: true,
          totalAmount: true,
          depositAmount: true,
          securityDeposit: true,
          damageFee: true,
          pickedUpAt: true,
          returnedAt: true
        }
      });

      // Calculate real income
        const realIncome = ordersForRevenueResult.data.reduce((sum: number, order: any) => {
          return sum + calculateOrderRevenue(order);
        }, 0);

        // Get future income (pending orders with future return dates)
        const futureIncome = await db.orders.aggregate({
          where: {
            status: { in: [ORDER_STATUS.RESERVED as any, ORDER_STATUS.PICKUPED as any] },
            returnPlanAt: {
            gte: startOfPeriod,
            lte: endOfPeriod
            },
            ...orderWhereClause
          },
          _sum: {
            totalAmount: true
          }
        });

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

      // Push data with outlet info if outlet comparison is enabled
      const dataPoint: any = {
        month: groupByType === 'month' ? periodLabel : `${periodLabel}`,
          year: year,
          realIncome: realIncome,
          futureIncome: futureIncome._sum?.totalAmount || 0,
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
        const monthName = current.toLocaleString('default', { month: 'short' });
        const year = current.getFullYear();
        const month = current.getMonth();
        
        // Calculate start and end of month
        const startOfMonth = new Date(year, month, 1);
        const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

        // Process each outlet separately if outletIds provided, otherwise process aggregated
        if (selectedOutletIds && outletsToProcess.length > 0) {
          // Process each outlet separately for comparison
          for (const outlet of outletsToProcess) {
            await processOutletIncome(outlet, startOfMonth, endOfMonth, monthName, year, 'month');
          }
        } else {
          // Default behavior: aggregate all outlets (or single outlet for outlet users)
          await processOutletIncome(null, startOfMonth, endOfMonth, monthName, year, 'month');
        }

        // Move to next month
        current.setMonth(current.getMonth() + 1);
      }
    } else if (groupBy === 'day') {
      // Generate daily data
      const current = new Date(start);
      const endDay = new Date(end);
      
      while (current <= endDay) {
        const dayName = current.toLocaleDateString('en-US', { weekday: 'short' });
        const monthName = current.toLocaleString('default', { month: 'short' });
        const year = current.getFullYear();
        const month = current.getMonth();
        const day = current.getDate();
        
        // Calculate start and end of day
        const startOfDay = new Date(year, month, day, 0, 0, 0);
        const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

        // Process each outlet separately if outletIds provided, otherwise process aggregated
        if (selectedOutletIds && outletsToProcess.length > 0) {
          // Process each outlet separately for comparison
          for (const outlet of outletsToProcess) {
            await processOutletIncome(outlet, startOfDay, endOfDay, `${monthName} ${day}`, year, 'day');
          }
        } else {
          // Default behavior: aggregate all outlets (or single outlet for outlet users)
          await processOutletIncome(null, startOfDay, endOfDay, `${monthName} ${day}`, year, 'day');
        }

        // Move to next day
        current.setDate(current.getDate() + 1);
      }
    }

    const body = JSON.stringify({ success: true, data: incomeData });
    const etag = crypto.createHash('sha1').update(body).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(body, { status: API.STATUS.OK, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=60' } });

  } catch (error) {
    console.error('Error fetching income analytics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';