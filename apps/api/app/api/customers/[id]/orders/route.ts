import { NextRequest, NextResponse } from 'next/server';
import { db, prisma } from '@rentalshop/database';
import { withPermissions } from '@rentalshop/auth/server';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';
import {
  fetchCustomerLoyaltySnapshot,
  fetchMerchantLoyaltyStatus,
} from '@/lib/customer-loyalty';

/**
 * GET /api/customers/[id]/orders
 * Get orders for one customer only (dedicated filter endpoint).
 *
 * Query: page, limit, sortBy, sortOrder, startDate?, endDate?
 *
 * Response includes:
 * - orders (paginated, role-scoped)
 * - customer snapshot + loyalty tier (Kim Cương, …)
 * - summary.totalOrders / summary.totalAmount for the same scope
 *
 * Security (role scope):
 * - ADMIN: all merchants / outlets
 * - MERCHANT: own merchant
 * - OUTLET_ADMIN / OUTLET_STAFF: assigned outlet only
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const customerId = parseInt(resolvedParams.id);
  
  return withPermissions(['orders.view'])(async (request, { user, userScope }) => {
    try {
      if (isNaN(customerId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_CUSTOMER_ID_FORMAT'),
          { status: 400 }
        );
      }

      // Validate that non-admin users have merchant association
      if (user.role !== USER_ROLE.ADMIN && !userScope.merchantId) {
        console.log('❌ Non-admin user without merchant association:', {
          role: user.role,
          merchantId: userScope.merchantId,
          outletId: userScope.outletId
        });
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
          { status: 403 }
        );
      }

      const customer = await db.customers.findById(customerId);
      if (!customer) {
        return NextResponse.json(
          ResponseBuilder.error('CUSTOMER_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Verify customer belongs to user's merchant (security check)
      if (user.role !== USER_ROLE.ADMIN && customer.merchantId !== userScope.merchantId) {
        console.log('❌ Customer does not belong to user\'s merchant:', {
          customerMerchantId: customer.merchantId,
          userMerchantId: userScope.merchantId
        });
        return NextResponse.json(
          ResponseBuilder.error('CUSTOMER_NOT_FOUND'), // Return NOT_FOUND for security (don't reveal customer exists)
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Parse pagination parameters from query string
      const { searchParams } = new URL(request.url);
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '50');
      const sortBy = searchParams.get('sortBy') || 'createdAt';
      const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
      const startDate = searchParams.get('startDate') || undefined;
      const endDate = searchParams.get('endDate') || undefined;

      // Build search filters with role-based access control
      const searchFilters: any = {
        customerId: customerId,
        page,
        limit,
        sortBy,
        sortOrder,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      };

      // Role-based merchant filtering:
      // - ADMIN role: Can see orders from all merchants
      // - MERCHANT role: Can only see orders from their own merchant
      // - OUTLET_ADMIN/OUTLET_STAFF: Can only see orders from their merchant
      if (user.role === USER_ROLE.ADMIN) {
        // Admins can see all orders - no merchant filtering
        // searchFilters.merchantId = undefined (no filter)
      } else {
        // Non-admin users restricted to their merchant
        searchFilters.merchantId = userScope.merchantId;
      }

      // Role-based outlet filtering:
      // - MERCHANT role: Can see orders from all outlets of their merchant
      // - OUTLET_ADMIN/OUTLET_STAFF: Can only see orders from their assigned outlet
      if (user.role === USER_ROLE.MERCHANT) {
        // Merchants can see all outlets - no outlet filtering
        // searchFilters.outletId = undefined (no filter)
      } else if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
        // Outlet users can only see orders from their assigned outlet
        searchFilters.outletId = userScope.outletId;
      }
      // ADMIN: no outlet filtering (can see all)

      console.log(`🔍 Role-based filtering for customer orders (${user.role}):`, {
        customerId,
        page,
        limit,
        startDate,
        endDate,
        'userScope.merchantId': userScope.merchantId,
        'userScope.outletId': userScope.outletId,
        'final merchantId filter': searchFilters.merchantId,
        'final outletId filter': searchFilters.outletId,
        'searchFilters': JSON.stringify(searchFilters, null, 2)
      });

      // Same scope as list search — used for accurate totalAmount in header
      const aggregateWhere: any = {
        deletedAt: null,
        customerId,
      };
      if (searchFilters.outletId) {
        aggregateWhere.outletId = searchFilters.outletId;
      } else if (searchFilters.merchantId) {
        aggregateWhere.outlet = { merchantId: searchFilters.merchantId };
      }
      if (startDate || endDate) {
        aggregateWhere.createdAt = {};
        if (startDate) aggregateWhere.createdAt.gte = new Date(startDate);
        if (endDate) aggregateWhere.createdAt.lte = new Date(endDate);
      }

      // Get orders + loyalty + money total for this customer
      const [orders, amountAgg, loyaltyStatus] = await Promise.all([
        db.orders.search(searchFilters),
        prisma.order.aggregate({
          where: aggregateWhere,
          _sum: { totalAmount: true },
        }),
        fetchMerchantLoyaltyStatus(customer.merchantId),
      ]);

      const loyalty =
        loyaltyStatus === 'active'
          ? await fetchCustomerLoyaltySnapshot(customerId)
          : null;
      
      console.log(`✅ Customer orders search result:`, {
        total: orders.total || 0,
        page: orders.page || page,
        limit: orders.limit || limit,
        dataLength: orders.data?.length || 0,
        hasData: !!(orders.data && orders.data.length > 0),
        totalAmount: amountAgg._sum.totalAmount || 0,
      });

      // Normalize date fields in order list to UTC ISO strings using toISOString()
      const normalizedOrders = (orders.data || []).map(order => ({
        ...order,
        createdAt: order.createdAt?.toISOString() || null,
        updatedAt: order.updatedAt?.toISOString() || null,
        pickupPlanAt: order.pickupPlanAt?.toISOString() || null,
        returnPlanAt: order.returnPlanAt?.toISOString() || null,
        pickedUpAt: order.pickedUpAt?.toISOString() || null,
        returnedAt: order.returnedAt?.toISOString() || null,
      }));

      const total = orders.total || 0;
      const resolvedPage = orders.page || page;
      const resolvedLimit = orders.limit || limit;

      // Use ResponseBuilder.success() for consistent response format
      // Match response structure with /api/orders endpoint + customer/summary for mobile header
      return NextResponse.json(
        ResponseBuilder.success('CUSTOMER_ORDERS_FOUND', {
          orders: normalizedOrders,
          total,
          page: resolvedPage,
          limit: resolvedLimit,
          offset: (resolvedPage - 1) * resolvedLimit,
          hasMore: resolvedPage * resolvedLimit < total,
          totalPages: Math.ceil(total / resolvedLimit) || 0,
          customer: {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            merchantId: customer.merchantId,
            loyaltyStatus,
            loyalty,
          },
          summary: {
            totalOrders: total,
            totalAmount: amountAgg._sum.totalAmount || 0,
          },
        })
      );

    } catch (error) {
      console.error('Error fetching customer orders:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}