import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/analytics/income - Get income analytics
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withManagementAuth(async (request, { user }) => {
  console.log(`💰 GET /api/analytics/income - User: ${user.email}`);
  
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    const { db } = result;

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'month';

    if (!startDate || !endDate) {
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', 'startDate and endDate are required'),
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Generate data based on groupBy parameter
    const incomeData = [];
    
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

        // Build where clause for orders - NO merchantId needed, DB is isolated
        const orderWhereClause: any = {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          }
        };

        // Outlet filtering for outlet-level users
        if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
          if (user.outletId) {
            orderWhereClause.outletId = user.outletId;
          }
        }

        // Get orders for revenue calculation using new formula
        const ordersForRevenueResult = await db.order.findMany({
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

        // Calculate revenue using the same formula as dashboard
        const calculateOrderRevenue = (order: any) => {
          if (order.orderType === 'SALE') {
            return order.totalAmount;
          } else {
            // RENT order
            if (order.status === 'RESERVED') {
              return order.depositAmount;
            } else if (order.status === 'PICKUPED') {
              return order.totalAmount - order.depositAmount + (order.securityDeposit || 0);
            } else if (order.status === 'RETURNED') {
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

        const realIncome = ordersForRevenueResult.reduce((sum: number, order: any) => {
          return sum + calculateOrderRevenue(order);
        }, 0);

        // Get future income (pending orders with future return dates)
        const futureIncome = await db.order.aggregate({
          where: {
            status: { in: ['RESERVED', 'ACTIVE'] },
            returnPlanAt: {
              gte: startOfMonth,
              lte: endOfMonth
            },
            ...orderWhereClause
          },
          _sum: {
            totalAmount: true
          }
        }).catch(() => ({ _sum: { totalAmount: 0 } }));

        // Get order count for the month
        const orderCount = await db.order.count({
          where: {
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth
            },
            status: { in: ['RESERVED', 'ACTIVE', 'COMPLETED'] },
            ...orderWhereClause
          }
        });

        incomeData.push({
          month: monthName,
          year: year,
          realIncome: realIncome,
          futureIncome: futureIncome._sum?.totalAmount || 0,
          orderCount: orderCount
        });

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

        // Build where clause for orders - NO merchantId needed, DB is isolated
        const orderWhereClause: any = {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          }
        };

        // Outlet filtering for outlet-level users
        if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
          if (user.outletId) {
            orderWhereClause.outletId = user.outletId;
          }
        }

        // Get orders for revenue calculation using new formula
        const ordersForRevenueResult = await db.order.findMany({
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

        // Calculate revenue using the same formula as dashboard
        const calculateOrderRevenue = (order: any) => {
          if (order.orderType === 'SALE') {
            return order.totalAmount;
          } else {
            // RENT order
            if (order.status === 'RESERVED') {
              return order.depositAmount;
            } else if (order.status === 'PICKUPED') {
              return order.totalAmount - order.depositAmount + (order.securityDeposit || 0);
            } else if (order.status === 'RETURNED') {
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

        const realIncome = ordersForRevenueResult.reduce((sum: number, order: any) => {
          return sum + calculateOrderRevenue(order);
        }, 0);

        // Get future income (pending orders with future return dates)
        const futureIncome = await db.order.aggregate({
          where: {
            status: { in: ['RESERVED', 'ACTIVE'] },
            returnPlanAt: {
              gte: startOfDay,
              lte: endOfDay
            },
            ...orderWhereClause
          },
          _sum: {
            totalAmount: true
          }
        }).catch(() => ({ _sum: { totalAmount: 0 } }));

        // Get order count for the day
        const orderCount = await db.order.count({
          where: {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay
            },
            status: { in: ['RESERVED', 'ACTIVE', 'COMPLETED'] },
            ...orderWhereClause
          }
        });

        incomeData.push({
          month: `${monthName} ${day}`,
          year: year,
          realIncome: realIncome,
          futureIncome: futureIncome._sum?.totalAmount || 0,
          orderCount: orderCount
        });

        // Move to next day
        current.setDate(current.getDate() + 1);
      }
    }

    const body = JSON.stringify(ResponseBuilder.success('INCOME_ANALYTICS_SUCCESS', incomeData));
    const etag = crypto.createHash('sha1').update(body).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(body, { 
      status: API.STATUS.OK, 
      headers: { 
        'Content-Type': 'application/json', 
        ETag: etag, 
        'Cache-Control': 'private, max-age=60' 
      } 
    });

  } catch (error) {
    console.error('Error fetching income analytics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});