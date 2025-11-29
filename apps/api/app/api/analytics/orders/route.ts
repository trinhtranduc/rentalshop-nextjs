import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, normalizeDateToISO, getUTCDateKey } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/analytics/orders - Get order analytics
 * Requires: Any authenticated user (scoped by role)
 * Permissions: All roles (ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF)
 */
export const GET = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN, USER_ROLE.OUTLET_STAFF])(async (request, { user, userScope }) => {
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
        return { period: '', count: 0, outletId: undefined, outletName: undefined };
    }

    // Add date filtering if provided
    if (startDate || endDate) {
      orderWhereClause.createdAt = {};
      if (startDate) orderWhereClause.createdAt.gte = new Date(startDate);
      if (endDate) orderWhereClause.createdAt.lte = new Date(endDate);
    }

      // Get orders based on outlet scope
    const orders = await db.orders.search({
      where: orderWhereClause,
      limit: 1000 // Get enough orders to analyze
    });

    // Group orders by time period
    const groupedOrders: { [key: string]: number } = {};
    
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
      
      groupedOrders[key] = (groupedOrders[key] || 0) + 1;
    });

      // Convert to array format with outlet info
      return Object.entries(groupedOrders).map(([period, count]) => {
        // Parse period string to create ISO date (use utility)
        // period is now YYYY/MM/DD or YYYY/MM format
        const periodDate = groupBy === 'day' 
          ? period.replace(/\//g, '-') // Convert YYYY/MM/DD to YYYY-MM-DD for Date parsing
          : period.replace(/\//g, '-') + '-01'; // Convert YYYY/MM to YYYY-MM-01
        const dateISO = normalizeDateToISO(periodDate);
        
        return {
          period, // Keep YYYY/MM/DD or YYYY/MM format for backward compatibility
          dateISO, // Full ISO string for mobile locale formatting (from utility)
          count,
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

    return NextResponse.json({
      success: true,
      data: analyticsData,
      code: 'ORDER_ANALYTICS_SUCCESS',
        message: 'Order analytics retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching order analytics:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const runtime = 'nodejs';