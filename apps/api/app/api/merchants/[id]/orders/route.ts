import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withPermissions, validateMerchantAccess } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder, ordersQuerySchema } from '@rentalshop/utils';
import { API, ORDER_STATUS, USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/orders
 * Get merchant orders with role-based access control
 * 
 * Authorization: All roles with 'orders.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * 
 * Security: Role-based filtering ensures users only see orders within their scope:
 * - ADMIN: Can see all orders (no restrictions)
 * - MERCHANT: Can only see orders from their own merchant
 * - OUTLET_ADMIN/OUTLET_STAFF: Can only see orders from their assigned outlet
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  
  return withPermissions(['orders.view'])(async (request, { user, userScope }) => {
    try {
      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const merchant = validation.merchant!;

      // Parse query parameters for pagination and filtering
      const { searchParams } = new URL(request.url);
      const parsed = ordersQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
      
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      const { 
        page,
        limit,
        q, 
        orderType,
        status,
        outletId: queryOutletId,
        customerId,
        productId,
        startDate,
        endDate,
        sortBy,
        sortOrder
      } = parsed.data;

      // Build search filters with role-based access control
      const searchFilters: any = {
        merchantId: merchantPublicId,
        page: page || 1,
        limit: limit || 50,
        sortBy: sortBy || 'createdAt',
        sortOrder: sortOrder || 'desc'
      };

      // Add optional filters
      if (q) searchFilters.search = q;
      if (orderType) searchFilters.orderType = orderType;
      if (status) searchFilters.status = status;
      if (customerId) searchFilters.customerId = customerId;
      if (productId) searchFilters.productId = productId;
      if (startDate) searchFilters.startDate = new Date(startDate);
      if (endDate) searchFilters.endDate = new Date(endDate);

      // Role-based outlet filtering:
      // - ADMIN role: Can see orders from all outlets
      // - MERCHANT role: Can see orders from all outlets of their merchant
      // - OUTLET_ADMIN/OUTLET_STAFF: Can only see orders from their assigned outlet
      if (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) {
        // Outlet users can only see orders from their assigned outlet
        searchFilters.outletId = userScope.outletId;
      } else if (queryOutletId) {
        // ADMIN and MERCHANT: can filter by specific outlet if provided
        searchFilters.outletId = queryOutletId;
      }
      // ADMIN and MERCHANT: no outlet filtering (can see all outlets) if queryOutletId not provided

      console.log(`🔍 Role-based filtering for merchant orders (${user.role}):`, {
        merchantPublicId,
        'userScope.merchantId': userScope.merchantId,
        'userScope.outletId': userScope.outletId,
        'final merchantId filter': searchFilters.merchantId,
        'final outletId filter': searchFilters.outletId,
        page: searchFilters.page,
        limit: searchFilters.limit
      });

      // Get orders for this merchant with role-based filtering and pagination
      const result = await db.orders.search(searchFilters);

      // Normalize date fields in order list to UTC ISO strings
      const normalizedOrders = (result.data || []).map((order: any) => ({
        ...order,
        createdAt: order.createdAt?.toISOString() || null,
        updatedAt: order.updatedAt?.toISOString() || null,
        pickupPlanAt: order.pickupPlanAt?.toISOString() || null,
        returnPlanAt: order.returnPlanAt?.toISOString() || null,
        pickedUpAt: order.pickedUpAt?.toISOString() || null,
        returnedAt: order.returnedAt?.toISOString() || null,
      }));

      return NextResponse.json({
        success: true,
        data: {
          orders: normalizedOrders,
          total: result.total || 0,
          page: result.page || searchFilters.page,
          limit: result.limit || searchFilters.limit,
          offset: ((result.page || searchFilters.page) - 1) * (result.limit || searchFilters.limit),
          hasMore: (result.page || searchFilters.page) * (result.limit || searchFilters.limit) < (result.total || 0),
          totalPages: Math.ceil((result.total || 0) / (result.limit || searchFilters.limit))
        },
        code: 'MERCHANT_ORDERS_FOUND',
        message: `Found ${result.total || 0} orders for merchant`
      });

    } catch (error) {
      console.error('Error fetching merchant orders:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * POST /api/merchants/[id]/orders
 * Create new order with role-based access control
 * 
 * Authorization: All roles with 'orders.create' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * 
 * Security: Validates merchant ownership before creating order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  
  return withPermissions(['orders.create'])(async (request, { user, userScope }) => {
    try {
      // Validate merchant access (format, exists, association, scope)
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }
      const merchant = validation.merchant!;

      const body = await request.json();
      const { orderType, outletId, customerId, orderItems, totalAmount, depositAmount } = body;

      // Verify outlet belongs to merchant (security check)
      if (outletId) {
        const outlet = await db.outlets.findById(outletId);
        if (!outlet) {
          return NextResponse.json(
            ResponseBuilder.error('OUTLET_NOT_FOUND'),
            { status: API.STATUS.NOT_FOUND }
          );
        }
        
        if (outlet.merchantId !== merchantPublicId) {
          console.log('❌ Outlet does not belong to merchant:', {
            outletMerchantId: outlet.merchantId,
            requestedMerchantId: merchantPublicId
          });
          return NextResponse.json(
            ResponseBuilder.error('OUTLET_NOT_FOUND'),
            { status: API.STATUS.NOT_FOUND }
          );
        }

        // For OUTLET_ADMIN/OUTLET_STAFF, verify they can only create orders for their outlet
        if ((user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) && outletId !== userScope.outletId) {
          console.log('❌ Outlet user trying to create order for different outlet:', {
            requestedOutletId: outletId,
            userOutletId: userScope.outletId
          });
          return NextResponse.json(
            ResponseBuilder.error('OUTLET_NOT_FOUND'),
            { status: API.STATUS.NOT_FOUND }
          );
        }
      }

      // Create new order
      const newOrder = await db.orders.create({
        orderType,
        outletId,
        customerId,
        orderItems,
        totalAmount,
        depositAmount,
        status: ORDER_STATUS.RESERVED,
        merchantId: merchant.id
      });

      return NextResponse.json({
        success: true,
        data: newOrder,
        code: 'ORDER_CREATED_SUCCESS',
        message: 'Order created successfully'
      });

    } catch (error) {
      console.error('Error creating order:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}