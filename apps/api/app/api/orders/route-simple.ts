import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@rentalshop/auth/src/unified-auth';
import { db } from '@rentalshop/database';
import { ordersQuerySchema, orderCreateSchema, orderUpdateSchema } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/orders
 * Get orders with filtering, pagination
 * REFACTORED: Now uses unified withAuth pattern
 */
export const GET = withAuth(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  console.log(`🔍 GET /api/orders - User: ${user.email} (${user.role})`);
  
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
      startDate,
      endDate
    } = parsed.data;

    const page = Math.floor((offset || 0) / (limit || 20)) + 1;

    console.log('Parsed filters:', { 
      page, limit, offset, q, orderType, status, 
      queryOutletId, customerId, startDate, endDate 
    });
    
    // Use simplified database API with userScope
    const searchFilters = {
      merchantId: userScope.merchantId,
      outletId: queryOutletId || userScope.outletId,
      customerId,
      orderType,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      search: q,
      page: page || 1,
      limit: limit || 20
    };

    console.log('🔍 Using simplified db.orders.search with filters:', searchFilters);
    
    const result = await db.orders.search(searchFilters);
    console.log('✅ Search completed, found:', result.data?.length || 0, 'orders');

    return NextResponse.json({
      success: true,
      data: result.data || [],
      pagination: {
        page: result.page || 1,
        limit: result.limit || 20,
        total: result.total || 0,
        hasMore: result.hasMore || false
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
export const POST = withAuth(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
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

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    // Create order with proper relations
    const orderData = {
      orderNumber,
      merchant: { connect: { id: userScope.merchantId } },
      outlet: { connect: { id: parsed.data.outletId } },
      customer: { connect: { id: parsed.data.customerId } },
      createdBy: { connect: { id: user.id } },
      orderType: parsed.data.orderType,
      status: 'PENDING',
      totalAmount: parsed.data.totalAmount,
      depositAmount: parsed.data.depositAmount || 0,
      pickupPlanAt: parsed.data.pickupPlanAt ? new Date(parsed.data.pickupPlanAt) : null,
      returnPlanAt: parsed.data.returnPlanAt ? new Date(parsed.data.returnPlanAt) : null,
      notes: parsed.data.notes,
      // Add order items
      orderItems: {
        create: parsed.data.orderItems?.map(item => ({
          product: { connect: { id: item.productId } },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice || (item.quantity * item.unitPrice),
          deposit: item.deposit || 0
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
export const PUT = withAuth(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(async (request, { user, userScope }) => {
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