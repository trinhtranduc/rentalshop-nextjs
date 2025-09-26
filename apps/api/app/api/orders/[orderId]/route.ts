import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';
import { updateOrder } from '@rentalshop/database';
import { prisma } from '@rentalshop/database';
import { assertAnyRole, getUserScope } from '@rentalshop/auth';
import { orderUpdateSchema } from '@rentalshop/utils';
import type { OrderUpdateInput } from '@rentalshop/types';
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
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const user = authResult.user;

    const { orderId } = params;
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Get user scope for authorization
    const userScope = getUserScope(user as any);
    
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
        outlet: true,
        orderItems: {
          include: {
            product: true
          }
        },
        payments: true,
        createdBy: true,
        merchant: true
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

    // Authorization: Users can only view orders from their own outlet or if they're admin/merchant
    if (userScope.outletId && order.outlet.id !== userScope.outletId) {
      // Check if user has admin or merchant role
      try {
        assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You can only view orders from your own outlet' },
          { status: API.STATUS.FORBIDDEN }
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
export async function PUT(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const user = authResult.user;

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
    const parsed = orderUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const updateData = parsed.data;
    const updateInput: OrderUpdateInput = {
      orderType: 'RENT', // Default value
      outletId: 0, // Default value
      createdById: user.id, // Required field
      orderItems: [], // Default empty array for updates
      subtotal: 0, // Default value
      totalAmount: 0, // Default value
      ...(updateData.status !== undefined && { status: updateData.status as any }),
      ...(updateData.customerId !== undefined && { customerId: updateData.customerId }),
      ...(updateData.outletId !== undefined && { outletId: updateData.outletId }),
      ...(updateData.pickupPlanAt !== undefined && { pickupPlanAt: updateData.pickupPlanAt }),
      ...(updateData.returnPlanAt !== undefined && { returnPlanAt: updateData.returnPlanAt }),
      ...(updateData.pickedUpAt !== undefined && { pickedUpAt: updateData.pickedUpAt }),
      ...(updateData.returnedAt !== undefined && { returnedAt: updateData.returnedAt }),
      ...(updateData.rentalDuration !== undefined && { rentalDuration: updateData.rentalDuration }),
      ...(updateData.discountType !== undefined && { discountType: updateData.discountType }),
      ...(updateData.discountValue !== undefined && { discountValue: updateData.discountValue }),
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
      // Order items management - convert productId from number to string for database
      ...(updateData.orderItems !== undefined && { 
        orderItems: updateData.orderItems.map(item => ({
          ...item,
          productId: item.productId.toString(), // Convert number to string for database
          totalPrice: item.totalPrice || 0, // Ensure totalPrice is always defined
        }))
      }),
    };

    // Update the order
    const orderIdNumber = parseInt(orderId);
    if (isNaN(orderIdNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID format' },
        { status: 400 }
      );
    }
    
    const updatedOrder = await updateOrder(orderIdNumber, updateInput);

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
export async function DELETE(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }

    const user = authResult.user;

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
    
    const cancelledOrder = await updateOrder(orderIdNumber, {
      orderType: 'RENT', // Default value
      outletId: 0, // Default value
      createdById: user.id, // Required field
      orderItems: [], // Default empty array
      subtotal: 0, // Default value
      totalAmount: 0, // Default value
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
