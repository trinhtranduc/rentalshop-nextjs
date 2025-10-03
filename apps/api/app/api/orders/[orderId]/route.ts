import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db, prisma } from '@rentalshop/database';
import { assertAnyRole } from '@rentalshop/auth';
import { orderUpdateSchema } from '@rentalshop/utils';
import type { OrderUpdateInput, OrderItemInput } from '@rentalshop/types';
import {API} from '@rentalshop/constants';

/**
 * GET /api/orders/[orderId]
 * Get detailed information about a specific order
 * 
 * This endpoint provides comprehensive order details including:
 * - Order information (status, dates, amounts)
 * - Customer details
 * - Outlet information
 * - Order items with product details
 * - Payment history
 * - Order notes and status updates
 */
async function handleGetOrder(
  request: NextRequest,
  context: { user: any; userScope: any },
  params: { orderId: string }
) {
  const { user, userScope } = context;
  try {

    const { orderId } = params;
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

        // Get user scope for authorization
    
    // Get order by id (number)
    const orderIdNumber = parseInt(orderId);
    if (isNaN(orderIdNumber)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid order ID format',
        error: 'INVALID_ORDER_ID'
      }, { status: 400 });
    }
    
    const order = await prisma.order.findUnique({
      where: { id: orderIdNumber },
      include: {
        customer: true,
        outlet: {
          include: {
            merchant: true
          }
        },
        orderItems: {
          include: {
            product: true
          }
        },
        payments: true,
        createdBy: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Debug logging to see what we're getting from the database
    console.log('🔍 API Debug - Order from database:');
    console.log('Order keys:', Object.keys(order));
    console.log('Has createdBy:', !!order.createdBy);
    console.log('Has createdById:', !!order.createdById);
    if (order.createdBy) {
      console.log('createdBy data:', order.createdBy);
    }

    // Authorization: Users can only view orders from their own outlet/merchant or if they're admin
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      // Outlet users can only see orders from their outlet
      if (order.outlet.id !== userScope.outletId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You can only view orders from your own outlet' },
          { status: API.STATUS.FORBIDDEN }
        );
      }
    } else if (user.role === 'MERCHANT') {
      // Merchant users can see orders from their merchant
      if (order.outlet.merchantId !== userScope.merchantId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You can only view orders from your own merchant' },
          { status: API.STATUS.FORBIDDEN }
        );
      }
    }
    // ADMIN users can see all orders

    // Format the response with additional computed fields
    const orderDetail = {
      ...order,
      // Add computed fields for frontend convenience
      customerFullName: order.customer 
        ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
        : 'Guest Customer',
      customerContact: order.customer?.phone || order.customer?.email || 'No contact info',
      totalItems: order.orderItems.reduce((sum: any, item: any) => sum + item.quantity, 0),
      isRental: order.orderType === 'RENT',
      isOverdue: order.status === 'PICKUPED' && order.returnPlanAt && new Date() > order.returnPlanAt,
      daysOverdue: order.status === 'PICKUPED' && order.returnPlanAt 
        ? Math.max(0, Math.ceil((new Date().getTime() - order.returnPlanAt.getTime()) / (1000 * 60 * 60 * 24)))
        : 0,
      // Calculate rental duration for rental orders
      rentalDuration: order.orderType === 'RENT' && order.pickupPlanAt && order.returnPlanAt
        ? Math.ceil((new Date(order.returnPlanAt).getTime() - new Date(order.pickupPlanAt).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      // Payment summary
      paymentSummary: {
        totalPaid: order.payments
          .filter((p: any) => p.status === 'COMPLETED')
          .reduce((sum: any, p: any) => sum + p.amount, 0),
        totalPending: order.payments
          .filter((p: any) => p.status === 'PENDING')
          .reduce((sum: any, p: any) => sum + p.amount, 0),
        totalFailed: order.payments
          .filter((p: any) => p.status === 'FAILED')
          .reduce((sum: any, p: any) => sum + p.amount, 0),
        remainingBalance: order.totalAmount - order.payments
          .filter((p: any) => p.status === 'COMPLETED')
          .reduce((sum: any, p: any) => sum + p.amount, 0)
      },
      // Status timeline (simplified - in a real app you might want a separate history table)
      statusTimeline: [
        {
          status: 'RESERVED',
          timestamp: order.createdAt,
          description: 'Order created'
        },
        ...(order.status !== 'RESERVED' ? [{
          status: 'RESERVED',
          timestamp: order.updatedAt,
                      description: 'Order reserved'
        }] : []),
        ...(order.pickedUpAt ? [{
          status: 'PICKUPED',
          timestamp: order.pickedUpAt,
          description: 'Items picked up'
        }] : []),
        ...(order.returnedAt ? [{
          status: 'COMPLETED',
          timestamp: order.returnedAt,
          description: 'Items returned'
        }] : [])
      ].filter(item => item.timestamp)
    };

    // Debug logging for final response
    console.log('🔍 API Debug - Final response:');
    console.log('Response keys:', Object.keys(orderDetail));
    console.log('Has createdBy in response:', !!orderDetail.createdBy);
    if (orderDetail.createdBy) {
      console.log('createdBy in response:', orderDetail.createdBy);
    }

    return NextResponse.json({
      success: true,
      data: orderDetail
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * PUT /api/orders/[orderId]
 * Update a specific order
 */
async function handleUpdateOrder(
  request: NextRequest,
  context: { user: any; userScope: any },
  params: { orderId: string }
) {
  const { user, userScope } = context;
  try {
    console.log('🔧 [UPDATE] Starting order update:', params.orderId);
    console.log('🔧 [UPDATE] User:', { id: user.id, email: user.email, role: user.role });
    console.log('🔧 [UPDATE] UserScope:', userScope);

    const { orderId } = params;
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Authorization: updating orders requires outlet team or merchant/admin
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
    } catch {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: API.STATUS.FORBIDDEN });
    }

    // Parse and validate request body
    const body = await request.json();
    
    // Simple validation for status update
    if (body.status && !['RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED'].includes(body.status)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid status. Must be one of: RESERVED, PICKUPED, RETURNED, COMPLETED, CANCELLED' 
      }, { status: 400 });
    }

    const updateData = body;
    
    console.log('🔧 API Route - Update data received:', {
      hasOrderItems: !!updateData.orderItems,
      orderItemsLength: updateData.orderItems?.length,
      orderItemsPreview: updateData.orderItems?.slice(0, 2)
    });
    
    // Build update input - pass orderItems directly without transformation
    const updateInput: any = {};
    
    if (updateData.status !== undefined) updateInput.status = updateData.status;
    if (updateData.customerId !== undefined) updateInput.customerId = updateData.customerId;
    if (updateData.outletId !== undefined) updateInput.outletId = updateData.outletId;
    if (updateData.orderType !== undefined) updateInput.orderType = updateData.orderType;
    if (updateData.totalAmount !== undefined) updateInput.totalAmount = updateData.totalAmount;
    if (updateData.depositAmount !== undefined) updateInput.depositAmount = updateData.depositAmount;
    if (updateData.securityDeposit !== undefined) updateInput.securityDeposit = updateData.securityDeposit;
    if (updateData.damageFee !== undefined) updateInput.damageFee = updateData.damageFee;
    if (updateData.lateFee !== undefined) updateInput.lateFee = updateData.lateFee;
    if (updateData.discountType !== undefined) updateInput.discountType = updateData.discountType;
    if (updateData.discountValue !== undefined) updateInput.discountValue = updateData.discountValue;
    if (updateData.discountAmount !== undefined) updateInput.discountAmount = updateData.discountAmount;
    if (updateData.pickupPlanAt !== undefined) updateInput.pickupPlanAt = typeof updateData.pickupPlanAt === 'string' ? new Date(updateData.pickupPlanAt) : updateData.pickupPlanAt;
    if (updateData.returnPlanAt !== undefined) updateInput.returnPlanAt = typeof updateData.returnPlanAt === 'string' ? new Date(updateData.returnPlanAt) : updateData.returnPlanAt;
    if (updateData.pickedUpAt !== undefined) updateInput.pickedUpAt = typeof updateData.pickedUpAt === 'string' ? new Date(updateData.pickedUpAt) : updateData.pickedUpAt;
    if (updateData.returnedAt !== undefined) updateInput.returnedAt = typeof updateData.returnedAt === 'string' ? new Date(updateData.returnedAt) : updateData.returnedAt;
    if (updateData.rentalDuration !== undefined) updateInput.rentalDuration = updateData.rentalDuration;
    if (updateData.isReadyToDeliver !== undefined) updateInput.isReadyToDeliver = updateData.isReadyToDeliver;
    if (updateData.collateralType !== undefined) updateInput.collateralType = updateData.collateralType;
    if (updateData.collateralDetails !== undefined) updateInput.collateralDetails = updateData.collateralDetails;
    if (updateData.notes !== undefined) updateInput.notes = updateData.notes;
    if (updateData.pickupNotes !== undefined) updateInput.pickupNotes = updateData.pickupNotes;
    if (updateData.returnNotes !== undefined) updateInput.returnNotes = updateData.returnNotes;
    if (updateData.damageNotes !== undefined) updateInput.damageNotes = updateData.damageNotes;
    
    // Pass orderItems as-is - the updateOrder function will handle the nested write conversion
    if (updateData.orderItems !== undefined && Array.isArray(updateData.orderItems)) {
      updateInput.orderItems = updateData.orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice || (item.quantity * item.unitPrice),
        deposit: item.deposit || 0,
        notes: item.notes || '',
        rentalDays: item.daysRented
      }));
      console.log('🔧 API Route - Passing', updateInput.orderItems.length, 'order items to updateOrder function');
    }

    console.log('🔧 API Route - Final updateInput keys:', Object.keys(updateInput));

    // Update the order
    const orderIdNumber = parseInt(orderId);
    if (isNaN(orderIdNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID format' },
        { status: 400 }
      );
    }
    
    console.log('🔧 [UPDATE] Calling db.orders.update with id:', orderIdNumber);
    console.log('🔧 [UPDATE] Update input:', updateInput);
    const updatedOrder = await db.orders.update(orderIdNumber, updateInput);
    console.log('🔧 [UPDATE] Update result:', !!updatedOrder);

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
    });

  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * DELETE /api/orders/[orderId]
 * Cancel a specific order
 */
async function handleDeleteOrder(
  request: NextRequest,
  context: { user: any; userScope: any },
  params: { orderId: string }
) {
  const { user, userScope } = context;
  try {

    const { orderId } = params;
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Authorization: cancelling orders requires outlet team or merchant/admin
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
    } catch {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: API.STATUS.FORBIDDEN });
    }

    // Parse request body for cancellation reason
    const body = await request.json();
    const reason = body?.reason || 'Order cancelled by user';

    // Cancel the order by updating status
    const orderIdNumber = parseInt(orderId);
    if (isNaN(orderIdNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID format' },
        { status: 400 }
      );
    }
    
    const cancelledOrder = await db.orders.update(orderIdNumber, {
      status: 'CANCELLED',
      notes: reason
    });

    if (!cancelledOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    return NextResponse.json({
      success: true,
      data: cancelledOrder,
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export const runtime = 'nodejs';

// Export functions with withAuthRoles wrapper
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleGetOrder(req, context, params)
  );
  return authenticatedHandler(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleUpdateOrder(req, context, params)
  );
  return authenticatedHandler(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleDeleteOrder(req, context, params)
  );
  return authenticatedHandler(request);
}