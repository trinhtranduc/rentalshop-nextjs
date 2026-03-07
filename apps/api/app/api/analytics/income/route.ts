import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { withPermissions } from '@rentalshop/auth/server';
import { db, prisma } from '@rentalshop/database';
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
      // IMPORTANT: Use OR conditions to include orders created BEFORE period but picked up/returned DURING period
      const ordersWhereClause: any = {
        deletedAt: null, // Exclude soft-deleted orders
        OR: [
          // Orders created in period
          { createdAt: { gte: startOfPeriod, lte: endOfPeriod } },
          // Orders picked up in period (CRITICAL: includes orders created before period)
          { pickedUpAt: { gte: startOfPeriod, lte: endOfPeriod, not: null } },
          // Orders returned in period (CRITICAL: includes orders created/picked up before period)
          { returnedAt: { gte: startOfPeriod, lte: endOfPeriod, not: null } },
          // Orders cancelled in period
          { updatedAt: { gte: startOfPeriod, lte: endOfPeriod }, status: ORDER_STATUS.CANCELLED as any },
          // Orders with future pickup plan in period
          { pickupPlanAt: { gte: startOfPeriod, lte: endOfPeriod, not: null } },
          // Orders with future return plan in period
          { returnPlanAt: { gte: startOfPeriod, lte: endOfPeriod, not: null } }
        ]
      };

      // Apply outlet filtering
      if (outlet) {
        // Convert outlet.publicId to CUID
        const outletObj = await db.outlets.findById(outlet.publicId);
        if (outletObj) {
          ordersWhereClause.outletId = outletObj.id;
        }
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

      // Query directly from Prisma with OR conditions to get ALL orders with events in period
      // This ensures orders created before period but picked up/returned during period are included
      const allOrders = await prisma.order.findMany({
        where: ordersWhereClause,
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          totalAmount: true,
          depositAmount: true,
          securityDeposit: true,
          damageFee: true,
          lateFee: true,
          discountType: true,
          discountValue: true,
          discountAmount: true,
          pickupPlanAt: true,
          returnPlanAt: true,
          pickedUpAt: true,
          returnedAt: true,
          createdAt: true,
          updatedAt: true
        },
        take: 10000 // Large limit to get all orders
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

      // Calculate total deposit collected (tiền thế chân thu được)
      // Tính securityDeposit dựa vào ngày phát sinh (ngày thu tiền cọc)
      // - RESERVED: Tính nếu có securityDeposit và createdAt trong period
      // - PICKUPED: Tính nếu có securityDeposit và pickedUpAt trong period
      // - RETURNED: KHÔNG tính (đã trả lại)
      // - CANCELLED: KHÔNG tính (đã hoàn lại)
      let totalDepositRefund = 0;
      // Calculate total collateral (tổng tiền thế chân) - chỉ tính cho đơn đã PICKUPED
      // LƯU Ý: totalCollateral chỉ tính cho đơn được pickup TRONG period (pickedUpAt trong period)
      // Không tính cho đơn được pickup trước period dù vẫn đang PICKUPED
      let totalCollateral = 0;
      // Calculate total collateral plan (tổng tiền thế chân dự kiến) - chỉ tính cho đơn RESERVED có pickupPlanAt trong tương lai
      let totalCollateralPlan = 0;
      for (const order of allOrders) {
        if (order.orderType !== ORDER_TYPE.RENT) continue;
        
        const securityDeposit = order.securityDeposit || 0;
        if (securityDeposit === 0) continue;

        // Tính khi RESERVED: Nếu có securityDeposit và createdAt trong period
        if (
          order.status === ORDER_STATUS.RESERVED &&
          order.createdAt &&
          new Date(order.createdAt) >= startOfPeriod &&
          new Date(order.createdAt) <= endOfPeriod
        ) {
          totalDepositRefund += securityDeposit;
        }
        
        // Tính khi PICKUPED: Nếu có securityDeposit và pickedUpAt trong period
        if (
          order.status === ORDER_STATUS.PICKUPED &&
          order.pickedUpAt &&
          new Date(order.pickedUpAt) >= startOfPeriod &&
          new Date(order.pickedUpAt) <= endOfPeriod
        ) {
          totalDepositRefund += securityDeposit;
          // Tính tổng tiền thế chân (chỉ cho đơn đã PICKUPED và được pickup trong period)
          totalCollateral += securityDeposit;
        }
        
        // KHÔNG tính khi RETURNED hoặc CANCELLED (đã trả lại/hoàn lại)
      }
      
      // ============================================================================
      // TÍNH TỔNG TIỀN THẾ CHÂN: Query riêng để đảm bảo tính đúng
      // ============================================================================
      // Query riêng với filter pickedUpAt để tính totalCollateral chính xác
      // Đảm bảo chỉ tính orders được pickup TRONG period (không tính orders được pickup trước period)
      // Query tất cả orders có status PICKUPED và được pickup trong period
      const collateralWhereClause: any = {
        orderType: ORDER_TYPE.RENT,
        status: ORDER_STATUS.PICKUPED,
        pickedUpAt: {
          gte: startOfPeriod,
          lte: endOfPeriod,
          not: null
        },
        deletedAt: null
      };
      
      // Apply outlet filtering
      if (outlet) {
        // Convert outlet.publicId to CUID
        const outletObj = await db.outlets.findById(outlet.publicId);
        if (outletObj) {
          collateralWhereClause.outletId = outletObj.id;
        }
      } else if (userScope.merchantId && !selectedOutletIds) {
        const merchant = await db.merchants.findById(userScope.merchantId);
        if (merchant && merchant.outlets) {
          collateralWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
        }
      } else if (userScope.outletId) {
        const outletObj = await db.outlets.findById(userScope.outletId);
        if (outletObj) {
          collateralWhereClause.outletId = outletObj.id;
        }
      }
      
      // Query orders trực tiếp từ Prisma để tính totalCollateral chính xác
      // Sử dụng pickedUpAt filter thay vì createdAt
      const collateralOrders = await prisma.order.findMany({
        where: collateralWhereClause,
        select: {
          securityDeposit: true,
          pickedUpAt: true
        }
      });
      
      // Tính lại totalCollateral từ query riêng
      totalCollateral = collateralOrders.reduce((sum: number, order: any) => {
        return sum + (order.securityDeposit || 0);
      }, 0);
      
      console.log(`💰 Total Collateral calculated: ${totalCollateral} from ${collateralOrders.length} PICKUPED orders (pickedUpAt in period ${startOfPeriod.toISOString()} - ${endOfPeriod.toISOString()})`);

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
        orderCount: orderCount,
        depositRefund: totalDepositRefund, // Tiền thế chân thu được (tính theo ngày phát sinh: RESERVED hoặc PICKUPED)
        totalCollateral: totalCollateral, // Tổng tiền thế chân (chỉ tính cho đơn đã PICKUPED)
        totalCollateralPlan: totalCollateralPlan // Tổng tiền thế chân dự kiến (chỉ tính cho đơn RESERVED có pickupPlanAt trong tương lai)
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
