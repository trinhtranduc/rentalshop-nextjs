import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder, normalizeDateToISO, getUTCDateKey, normalizeStartDate, normalizeEndDate } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/analytics/orders - Get order analytics
 * 
 * Authorization: Roles with 'analytics.view.orders' permission can access
 * - ADMIN, MERCHANT, OUTLET_ADMIN: Can view order analytics
 * - OUTLET_STAFF: Cannot access (dashboard only)
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['analytics.view.orders'])(async (request, { user, userScope }) => {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy') || 'month'; // month or day
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const outletIdsParam = searchParams.get('outletIds'); // Comma-separated outlet IDs for comparison

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

    // Helper function to process orders for a specific outlet
    const processOutletOrders = async (outlet: { id: string; publicId: number; name: string } | null) => {
      // Build where clause for orders
      const orderWhereClause: any = {};

      // Apply outlet filtering
      if (outlet) {
        orderWhereClause.outletId = outlet.id;
      } else if (user.role === USER_ROLE.MERCHANT && userScope.merchantId && !selectedOutletIds) {
        // Aggregate all merchant outlets (default behavior when no outletIds specified)
        const merchant = await db.merchants.findById(userScope.merchantId);
        if (merchant && merchant.outlets) {
          orderWhereClause.outletId = { in: merchant.outlets.map((o: any) => o.id) };
        }
      } else if ((user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) && userScope.outletId) {
        const outletObj = await db.outlets.findById(userScope.outletId);
        if (outletObj) {
          orderWhereClause.outletId = outletObj.id;
        }
      } else if (user.role === USER_ROLE.ADMIN) {
        // ADMIN users see all data (system-wide access)
        // No additional filtering needed for ADMIN role
      } else {
        // All other users without merchant/outlet assignment should see no data
        return [];
      }

    // Add date filtering if provided
    if (startDate || endDate) {
      orderWhereClause.createdAt = {};
      const normalizedStart = startDate ? normalizeStartDate(startDate) : null;
      const normalizedEnd = endDate ? normalizeEndDate(endDate) : null;
      if (normalizedStart) orderWhereClause.createdAt.gte = normalizedStart;
      if (normalizedEnd) orderWhereClause.createdAt.lte = normalizedEnd;
    }

      // Get orders based on outlet scope
    const orders = await db.orders.search({
      where: orderWhereClause,
      limit: 1000 // Get enough orders to analyze
    });

    // Group orders by time period and calculate total collateral
    const groupedOrders: { [key: string]: { count: number; totalCollateral: number; totalCollateralPlan: number } } = {};
    const now = new Date();
    
    orders.data?.forEach(order => {
      const date = new Date(order.createdAt);
      let key: string;
      
      if (groupBy === 'day') {
        // Use utility to get YYYY/MM/DD format
        key = getUTCDateKey(date);
      } else {
        // YYYY/MM format for monthly grouping
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        key = `${year}/${month}`;
      }
      
      if (!groupedOrders[key]) {
        groupedOrders[key] = { count: 0, totalCollateral: 0, totalCollateralPlan: 0 };
      }
      
      groupedOrders[key].count += 1;
      
      // Tính tổng tiền thế chân (chỉ cho đơn đã PICKUPED)
      if (order.orderType === ORDER_TYPE.RENT && order.status === ORDER_STATUS.PICKUPED) {
        const securityDeposit = order.securityDeposit || 0;
        groupedOrders[key].totalCollateral += securityDeposit;
      }
      
      // Tính tổng tiền thế chân dự kiến (chỉ cho đơn RESERVED có pickupPlanAt trong tương lai)
      if (order.orderType === ORDER_TYPE.RENT && order.status === ORDER_STATUS.RESERVED) {
        const securityDeposit = order.securityDeposit || 0;
        if (securityDeposit > 0 && order.pickupPlanAt) {
          const pickupPlanDate = new Date(order.pickupPlanAt);
          if (pickupPlanDate >= now) {
            // Chỉ tính nếu pickupPlanAt trong tương lai
            groupedOrders[key].totalCollateralPlan += securityDeposit;
          }
        }
      }
    });

      // Convert to array format with outlet info
      return Object.entries(groupedOrders).map(([period, data]) => {
        // Parse period string to create ISO date (use utility)
        // period is now YYYY/MM/DD or YYYY/MM format
        const periodDate = groupBy === 'day' 
          ? period.replace(/\//g, '-') // Convert YYYY/MM/DD to YYYY-MM-DD for Date parsing
          : period.replace(/\//g, '-') + '-01'; // Convert YYYY/MM to YYYY-MM-01
        const dateISO = normalizeDateToISO(periodDate);
        
        return {
          period, // Keep YYYY/MM/DD or YYYY/MM format for backward compatibility
          dateISO, // Full ISO string for mobile locale formatting (from utility)
          count: data.count,
          totalCollateral: data.totalCollateral, // Tổng tiền thế chân (chỉ tính cho đơn đã PICKUPED)
          totalCollateralPlan: data.totalCollateralPlan, // Tổng tiền thế chân dự kiến (chỉ tính cho đơn RESERVED có pickupPlanAt trong tương lai)
          ...(outlet ? { outletId: outlet.publicId, outletName: outlet.name } : {})
        };
      }).sort((a, b) => a.period.localeCompare(b.period));
    };

    // Process orders for each outlet separately if outletIds provided, otherwise process aggregated
    let analyticsData: any[] = [];
    if (selectedOutletIds && outletsToProcess.length > 0) {
      // Process each outlet separately for comparison
      for (const outlet of outletsToProcess) {
        const outletData = await processOutletOrders(outlet);
        analyticsData.push(...outletData);
      }
    } else {
      // Default behavior: aggregate all outlets (or single outlet for outlet users)
      analyticsData = await processOutletOrders(null);
    }

    return NextResponse.json(
      ResponseBuilder.success('ORDER_ANALYTICS_SUCCESS', analyticsData)
    );

  } catch (error) {
    console.error('❌ Error fetching order analytics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';