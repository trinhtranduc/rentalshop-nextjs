import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { getOrderByPublicId, getOrderByNumber, updateOrder, cancelOrder } from '@rentalshop/database';
import { assertAnyRole, getUserScope } from '@rentalshop/auth';
import { orderUpdateSchema } from '@rentalshop/utils';
import type { OrderUpdateInput } from '@rentalshop/types';

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
    
    // Determine if orderId is a publicId (number) or order number (string)
    let order = null;
    
    // Check if orderId is a number (publicId)
    if (/^\d+$/.test(orderId)) {
      const publicId = parseInt(orderId);
      order = await getOrderByPublicId(publicId);
    }
    
    // If not found by publicId, try by order number
    if (!order) {
      order = await getOrderByNumber(orderId);
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
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

    // Authorization: Users can only view orders from their own outlet or if they're admin/merchant
    if (userScope.outletId && order.outlet.publicId !== userScope.outletId) {
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
      isOverdue: order.status === 'PICKUPED' && order.returnPlanAt && new Date() > order.returnPlanAt,
      daysOverdue: order.status === 'PICKUPED' && order.returnPlanAt 
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
  { params }: { params: { orderId: number } }
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
      ...(updateData.rentalDuration !== undefined && { rentalDuration: updateData.rentalDuration }),
      ...(updateData.subtotal !== undefined && { subtotal: updateData.subtotal }),
      ...(updateData.taxAmount !== undefined && { taxAmount: updateData.taxAmount }),
      ...(updateData.discountAmount !== undefined && { discountAmount: updateData.discountAmount }),
      ...(updateData.totalAmount !== undefined && { totalAmount: updateData.totalAmount }),
      ...(updateData.depositAmount !== undefined && { depositAmount: updateData.depositAmount }),
      ...(updateData.securityDeposit !== undefined && { securityDeposit: updateData.securityDeposit }),
      ...(updateData.damageFee !== undefined && { damageFee: updateData.damageFee }),
      ...(updateData.lateFee !== undefined && { lateFee: updateData.lateFee }),
      ...(updateData.collateralType !== undefined && { collateralType: updateData.collateralType }),
      ...(updateData.collateralDetails !== undefined && { collateralDetails: updateData.collateralDetails }),
      ...(updateData.notes !== undefined && { notes: updateData.notes }),
      ...(updateData.pickupNotes !== undefined && { pickupNotes: updateData.pickupNotes }),
      ...(updateData.returnNotes !== undefined && { returnNotes: updateData.returnNotes }),
      ...(updateData.damageNotes !== undefined && { damageNotes: updateData.damageNotes }),
      ...(updateData.isReadyToDeliver !== undefined && { isReadyToDeliver: updateData.isReadyToDeliver }),
      // Additional settings fields
      ...(updateData.bailAmount !== undefined && { bailAmount: updateData.bailAmount }),
      ...(updateData.material !== undefined && { material: updateData.material }),
      // Order items management - convert productId from number to string for database
      ...(updateData.orderItems !== undefined && { 
        orderItems: updateData.orderItems.map(item => ({
          ...item,
          productId: item.productId.toString(), // Convert number to string for database
          totalPrice: item.totalPrice || 0, // Ensure totalPrice is always defined
        }))
      }),
    };

    // Update the order - convert user.id (CUID) to publicId (number)
    const updatedOrder = await updateOrder(orderId, updateInput, user.publicId);

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
  { params }: { params: { orderId: number } }
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

    // Cancel the order - convert user.id (CUID) to publicId (number)
    const cancelledOrder = await cancelOrder(orderId, user.publicId, reason);

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
