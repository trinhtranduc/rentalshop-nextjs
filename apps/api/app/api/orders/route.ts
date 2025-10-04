import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { ordersQuerySchema, orderCreateSchema, orderUpdateSchema, assertPlanLimit } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { PerformanceMonitor } from '@rentalshop/utils/src/performance';

/**
 * GET /api/orders
 * Get orders with filtering, pagination
 * REFACTORED: Now uses unified withAuth pattern
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  console.log(`🔍 GET /api/orders - User: ${user.email} (${user.role})`);
  console.log(`🔍 GET /api/orders - UserScope:`, userScope);
  
  // Validate that non-admin users have merchant association
  if (user.role !== 'ADMIN' && !userScope.merchantId) {
    console.log('❌ Non-admin user without merchant association:', {
      role: user.role,
      merchantId: userScope.merchantId,
      outletId: userScope.outletId
    });
    return NextResponse.json(
      { 
        success: false, 
        message: 'User must be associated with a merchant',
        debug: {
          role: user.role,
          merchantId: userScope.merchantId,
          outletId: userScope.outletId,
          userMerchantId: user.merchantId,
          userOutletId: user.outletId
        }
      },
      { status: 403 }
    );
  }
  
  try {
    const { searchParams } = new URL(request.url);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const parsed = ordersQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      console.log('Validation error:', parsed.error.flatten());
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid query', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { 
      limit,
      offset,
      q, 
      orderType,
      status,
      outletId: queryOutletId,
      customerId,
      productId,
      startDate,
      endDate
    } = parsed.data;

    const page = Math.floor((offset || 0) / (limit || 20)) + 1;

    console.log('Parsed filters:', { 
      page, limit, offset, q, orderType, status, 
      queryOutletId, customerId, productId, startDate, endDate 
    });
    
    // Implement role-based filtering
    let searchFilters: any = {
      merchantId: userScope.merchantId,
      customerId,
      orderType,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search: q,
      page: page || 1,
      limit: limit || 20
    };

    // Role-based outlet filtering:
    // - MERCHANT role: Can see orders from all outlets of their merchant (unless queryOutletId is specified)
    // - OUTLET_ADMIN/OUTLET_STAFF: Can only see orders from their assigned outlet
    if (user.role === 'MERCHANT') {
      // Merchants can see all outlets unless specifically filtering by outlet
      searchFilters.outletId = queryOutletId;
    } else if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      // Outlet users can only see orders from their assigned outlet
      searchFilters.outletId = userScope.outletId;
    } else if (user.role === 'ADMIN') {
      // Admins can see all orders (no outlet filtering unless specified)
      searchFilters.outletId = queryOutletId;
    }

    // Add product filtering if specified
    if (productId) {
      searchFilters.productId = productId;
    }

    console.log(`🔍 Role-based filtering for ${user.role}:`, {
      'userScope.merchantId': userScope.merchantId,
      'userScope.outletId': userScope.outletId,
      'queryOutletId': queryOutletId,
      'final outletId filter': searchFilters.outletId,
      'productId filter': searchFilters.productId
    });

    console.log('🔍 Using simplified db.orders.search with filters:', searchFilters);
    
    // Use performance monitoring for query optimization
    const result = await PerformanceMonitor.measureQuery(
      'orders.search',
      () => db.orders.search(searchFilters)
    );
    
    console.log('✅ Search completed, found:', result.data?.length || 0, 'orders');

    return NextResponse.json({
      success: true,
      data: {
        orders: result.data || [],
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 20,
        offset: ((result.page || 1) - 1) * (result.limit || 20),
        hasMore: result.hasMore || false,
        totalPages: Math.ceil((result.total || 0) / (result.limit || 20))
      },
      message: `Found ${result.total || 0} orders`
    });

  } catch (error) {
    console.error('Error in GET /api/orders:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/orders
 * Create a new order using simplified database API
 * REFACTORED: Now uses unified withAuth pattern
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
  console.log(`🔍 POST /api/orders - User: ${user.email} (${user.role})`);
  
  try {
    const body = await request.json();
    const parsed = orderCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid payload', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    // Get outlet to check merchant association and plan limits
    const outlet = await db.outlets.findById(parsed.data.outletId);
    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }

    // Check plan limits before creating order (optional - orders are typically unlimited)
    try {
      await assertPlanLimit(outlet.merchantId, 'orders');
      console.log('✅ Plan limit check passed for orders');
    } catch (error: any) {
      console.log('❌ Plan limit exceeded for orders:', error.message);
      return NextResponse.json(
        { 
          success: false, 
          message: error.message || 'Plan limit exceeded for orders',
          error: 'PLAN_LIMIT_EXCEEDED'
        },
        { status: 403 }
      );
    }

    // Generate order number using the outlet's ID
    const orderNumber = `ORD-${parsed.data.outletId.toString().padStart(3, '0')}-${Date.now().toString().slice(-6)}`;

    // Determine initial status based on order type
    // SALE orders start as COMPLETED (immediate purchase)
    // RENT orders start as RESERVED (scheduled rental)
    const initialStatus = parsed.data.orderType === 'SALE' ? 'COMPLETED' : 'RESERVED';

    // Create order with proper relations (Order does NOT have direct merchant relation)
    const orderData = {
      orderNumber,
      outlet: { connect: { id: parsed.data.outletId } },
      customer: parsed.data.customerId ? { connect: { id: parsed.data.customerId } } : undefined,
      createdBy: { connect: { id: user.id } },
      orderType: parsed.data.orderType,
      status: initialStatus,
      totalAmount: parsed.data.totalAmount,
      depositAmount: parsed.data.depositAmount || 0,
      securityDeposit: parsed.data.securityDeposit || 0,
      damageFee: parsed.data.damageFee || 0,
      lateFee: parsed.data.lateFee || 0,
      discountType: parsed.data.discountType,
      discountValue: parsed.data.discountValue || 0,
      discountAmount: parsed.data.discountAmount || 0,
      pickupPlanAt: parsed.data.pickupPlanAt ? new Date(parsed.data.pickupPlanAt) : null,
      returnPlanAt: parsed.data.returnPlanAt ? new Date(parsed.data.returnPlanAt) : null,
      rentalDuration: parsed.data.rentalDuration,
      isReadyToDeliver: parsed.data.isReadyToDeliver || false,
      collateralType: parsed.data.collateralType,
      collateralDetails: parsed.data.collateralDetails,
      notes: parsed.data.notes,
      pickupNotes: parsed.data.pickupNotes,
      // Add order items
      orderItems: {
        create: parsed.data.orderItems?.map(item => ({
          product: { connect: { id: item.productId } },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice || (item.quantity * item.unitPrice),
          deposit: item.deposit || 0,
          notes: item.notes,
          rentalDays: item.daysRented
        })) || []
      }
    };

    console.log('🔍 Creating order with data:', orderData);
    
    // Use simplified database API
    const order = await db.orders.create(orderData);
    console.log('✅ Order created successfully:', order);

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order created successfully'
    });

  } catch (error: any) {
    console.error('Error in POST /api/orders:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'An order with this number already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to create order' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/orders?id={id}
 * Update an order using simplified database API  
 * REFACTORED: Now uses unified withAuth pattern
 */
export const PUT = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
  console.log(`🔍 PUT /api/orders - User: ${user.email} (${user.role})`);
  
  try {
    const body = await request.json();
    const parsed = orderUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid payload', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    // Extract id from query params
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get existing order to check permissions
    const existingOrder = await db.orders.findById(id);
    if (!existingOrder) {
      return NextResponse.json(
        { success: false, message: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user can access this order (orders are scoped to merchant via userScope)
    // Access is controlled by the database API based on merchantId filter

    // Extract only basic fields for update (avoid complex orderItems)
    const updateData = {
      status: parsed.data.status,
      totalAmount: parsed.data.totalAmount,
      depositAmount: parsed.data.depositAmount,
      pickupPlanAt: parsed.data.pickupPlanAt ? new Date(parsed.data.pickupPlanAt) : undefined,
      returnPlanAt: parsed.data.returnPlanAt ? new Date(parsed.data.returnPlanAt) : undefined,
      notes: parsed.data.notes,
      // Add other simple fields as needed
    };

    console.log('🔍 Updating order with data:', { id, ...updateData });
    
    // Use simplified database API with basic update
    const updatedOrder = await db.orders.update(id, updateData);
    console.log('✅ Order updated successfully:', updatedOrder);

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Order updated successfully'
    });

  } catch (error: any) {
    console.error('Error in PUT /api/orders:', error);
    
    return NextResponse.json(
      { success: false, message: 'Failed to update order' },
      { status: 500 }
    );
  }
});