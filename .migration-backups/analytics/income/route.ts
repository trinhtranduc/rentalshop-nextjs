import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
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

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'startDate and endDate are required' },
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

        // Get real income (completed payments) with proper filtering
        const paymentWhereClause: any = {
          status: 'COMPLETED',
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          }
        };

        // Add user scope filtering for payments
        if (userScope.merchantId) {
          const merchant = await db.merchants.findById(userScope.merchantId );
          if (merchant) {
            paymentWhereClause.merchantId = merchant.id;
          }
        } else if (userScope.outletId) {
          // For outlet scope, filter through orders
          const outlet = await db.outlets.findById(userScope.outletId );
          if (outlet) {
            paymentWhereClause.order = {
              outletId: outlet.id
            };
          }
        } else if (user.role !== 'ADMIN') {
          // New users without merchant/outlet assignment should see no data
          console.log('🚫 User without merchant/outlet assignment:', {
            role: user.role,
            merchantId: userScope.merchantId,
            outletId: userScope.outletId
          });
          return NextResponse.json({
            success: true,
            data: [],
            message: 'No data available - user not assigned to merchant/outlet'
          });
        }

        // Build where clause for orders
        const orderWhereClause: any = {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          }
        };

        // Add user scope filtering for orders
        if (userScope.merchantId) {
          const merchant = await db.merchants.findById(userScope.merchantId);
          if (merchant && merchant.outlets) {
            orderWhereClause.outletId = { in: merchant.outlets.map((outlet: any) => outlet.id) };
          }
        } else if (userScope.outletId) {
          const outlet = await db.outlets.findById(userScope.outletId );
          if (outlet) {
            orderWhereClause.outletId = outlet.id;
          }
        }

        // Get orders for revenue calculation using new formula
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

        const realIncome = ordersForRevenueResult.data.reduce((sum: number, order: any) => {
          return sum + calculateOrderRevenue(order);
        }, 0);

        // Get future income (pending orders with future return dates)
        const futureIncome = await db.orders.aggregate({
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
        });

        // Get order count for the month
        const orderCount = await db.orders.getStats({
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

        // Get real income (completed payments) with proper filtering
        const paymentWhereClause: any = {
          status: 'COMPLETED',
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          }
        };

        // Add user scope filtering for payments
        if (userScope.merchantId) {
          const merchant = await db.merchants.findById(userScope.merchantId );
          if (merchant) {
            paymentWhereClause.merchantId = merchant.id;
          }
        } else if (userScope.outletId) {
          // For outlet scope, filter through orders
          const outlet = await db.outlets.findById(userScope.outletId );
          if (outlet) {
            paymentWhereClause.order = {
              outletId: outlet.id
            };
          }
        } else if (user.role !== 'ADMIN') {
          // New users without merchant/outlet assignment should see no data
          console.log('🚫 User without merchant/outlet assignment:', {
            role: user.role,
            merchantId: userScope.merchantId,
            outletId: userScope.outletId
          });
          return NextResponse.json({
            success: true,
            data: [],
            message: 'No data available - user not assigned to merchant/outlet'
          });
        }

        // Build where clause for orders
        const orderWhereClause: any = {
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          }
        };

        // Add user scope filtering for orders
        if (userScope.merchantId) {
          const merchant = await db.merchants.findById(userScope.merchantId);
          if (merchant && merchant.outlets) {
            orderWhereClause.outletId = { in: merchant.outlets.map((outlet: any) => outlet.id) };
          }
        } else if (userScope.outletId) {
          const outlet = await db.outlets.findById(userScope.outletId );
          if (outlet) {
            orderWhereClause.outletId = outlet.id;
          }
        }

        // Get orders for revenue calculation using new formula
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

        const realIncome = ordersForRevenueResult.data.reduce((sum: number, order: any) => {
          return sum + calculateOrderRevenue(order);
        }, 0);

        // Get future income (pending orders with future return dates)
        const futureIncome = await db.orders.aggregate({
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
        });

        // Get order count for the day
        const orderCount = await db.orders.getStats({
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