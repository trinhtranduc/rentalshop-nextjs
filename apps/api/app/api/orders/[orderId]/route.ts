import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { getOrderById, getOrderByNumber, updateOrder, cancelOrder } from '@rentalshop/database';
import { assertAnyRole, getUserScope } from '@rentalshop/auth';
import { orderUpdateSchema } from '@rentalshop/utils';
import type { OrderUpdateInput } from '@rentalshop/database';

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
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { orderId } = params;
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get user scope for authorization
    const userScope = getUserScope(user as any);
    
    // Try to find order by ID first, then by order number
    let order = await getOrderById(orderId);
    
    if (!order) {
      // If not found by ID, try by order number
      order = await getOrderByNumber(orderId);
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Authorization: Users can only view orders from their own outlet or if they're admin/merchant
    if (userScope.outletId && order.outlet.id !== userScope.outletId) {
      // Check if user has admin or merchant role
      try {
        assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You can only view orders from your own outlet' },
          { status: 403 }
        );
      }
    }

    // Format the response with additional computed fields
    const orderDetail = {
      ...order,
      // Add computed fields for frontend convenience
      customerFullName: order.customer 
        ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
        : 'Guest Customer',
      customerContact: order.customer?.phone || order.customer?.email || 'No contact info',
      totalItems: order.orderItems.reduce((sum, item) => sum + item.quantity, 0),
      isRental: order.orderType === 'RENT',
      isOverdue: order.status === 'ACTIVE' && order.returnPlanAt && new Date() > order.returnPlanAt,
      daysOverdue: order.status === 'ACTIVE' && order.returnPlanAt 
        ? Math.max(0, Math.ceil((new Date().getTime() - order.returnPlanAt.getTime()) / (1000 * 60 * 60 * 24)))
        : 0,
      // Calculate rental duration for rental orders
      rentalDuration: order.orderType === 'RENT' && order.pickupPlanAt && order.returnPlanAt
        ? Math.ceil((order.returnPlanAt.getTime() - order.pickupPlanAt.getTime()) / (1000 * 60 * 60 * 24))
        : null,
      // Payment summary
      paymentSummary: {
        totalPaid: order.payments
          .filter(p => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + p.amount, 0),
        totalPending: order.payments
          .filter(p => p.status === 'PENDING')
          .reduce((sum, p) => sum + p.amount, 0),
        totalFailed: order.payments
          .filter(p => p.status === 'FAILED')
          .reduce((sum, p) => sum + p.amount, 0),
        remainingBalance: order.totalAmount - order.payments
          .filter(p => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + p.amount, 0)
      },
      // Status timeline (simplified - in a real app you might want a separate history table)
      statusTimeline: [
        {
          status: 'PENDING',
          timestamp: order.createdAt,
          description: 'Order created'
        },
        ...(order.status !== 'PENDING' ? [{
          status: 'CONFIRMED',
          timestamp: order.updatedAt,
          description: 'Order confirmed'
        }] : []),
        ...(order.pickedUpAt ? [{
          status: 'ACTIVE',
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

    return NextResponse.json({
      success: true,
      data: orderDetail
    });

  } catch (error) {
    console.error('Error fetching order details:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orders/[orderId]
 * Update a specific order
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

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
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = orderUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const updateData = parsed.data;
    const updateInput: OrderUpdateInput = {
      ...(updateData.status !== undefined && { status: updateData.status as any }),
      ...(updateData.pickupPlanAt !== undefined && { pickupPlanAt: updateData.pickupPlanAt }),
      ...(updateData.returnPlanAt !== undefined && { returnPlanAt: updateData.returnPlanAt }),
      ...(updateData.pickedUpAt !== undefined && { pickedUpAt: updateData.pickedUpAt }),
      ...(updateData.returnedAt !== undefined && { returnedAt: updateData.returnedAt }),
      ...(updateData.subtotal !== undefined && { subtotal: updateData.subtotal }),
      ...(updateData.taxAmount !== undefined && { taxAmount: updateData.taxAmount }),
      ...(updateData.discountAmount !== undefined && { discountAmount: updateData.discountAmount }),
      ...(updateData.totalAmount !== undefined && { totalAmount: updateData.totalAmount }),
      ...(updateData.depositAmount !== undefined && { depositAmount: updateData.depositAmount }),
      ...(updateData.damageFee !== undefined && { damageFee: updateData.damageFee }),
      ...(updateData.notes !== undefined && { notes: updateData.notes }),
      ...(updateData.pickupNotes !== undefined && { pickupNotes: updateData.pickupNotes }),
      ...(updateData.returnNotes !== undefined && { returnNotes: updateData.returnNotes }),
      ...(updateData.damageNotes !== undefined && { damageNotes: updateData.damageNotes }),
    };

    // Update the order
    const updatedOrder = await updateOrder(orderId, updateInput, user.id);

    if (!updatedOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
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
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders/[orderId]
 * Cancel a specific order
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

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
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body for cancellation reason
    const body = await request.json();
    const reason = body?.reason || 'Order cancelled by user';

    // Cancel the order
    const cancelledOrder = await cancelOrder(orderId, user.id, reason);

    if (!cancelledOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
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
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
