import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { 
  getOrderById, 
  updateOrder, 
  cancelOrder 
} from '@rentalshop/database';
import type { OrderUpdateInput } from '@rentalshop/database';

// GET /api/orders/[id] - Get order by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const orderId = params.id;
    const order = await getOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });

  } catch (error) {
    console.error('Error getting order:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/orders/[id] - Update order
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const orderId = params.id;
    const body = await request.json();

    // Validate update input
    const updateInput: OrderUpdateInput = {};
    
    if (body.status !== undefined) updateInput.status = body.status;
    if (body.pickupPlanAt !== undefined) updateInput.pickupPlanAt = new Date(body.pickupPlanAt);
    if (body.returnPlanAt !== undefined) updateInput.returnPlanAt = new Date(body.returnPlanAt);
    if (body.pickedUpAt !== undefined) updateInput.pickedUpAt = new Date(body.pickedUpAt);
    if (body.returnedAt !== undefined) updateInput.returnedAt = new Date(body.returnedAt);
    if (body.subtotal !== undefined) updateInput.subtotal = body.subtotal;
    if (body.taxAmount !== undefined) updateInput.taxAmount = body.taxAmount;
    if (body.discountAmount !== undefined) updateInput.discountAmount = body.discountAmount;
    if (body.totalAmount !== undefined) updateInput.totalAmount = body.totalAmount;
    if (body.depositAmount !== undefined) updateInput.depositAmount = body.depositAmount;
    if (body.damageFee !== undefined) updateInput.damageFee = body.damageFee;
    if (body.notes !== undefined) updateInput.notes = body.notes;
    if (body.pickupNotes !== undefined) updateInput.pickupNotes = body.pickupNotes;
    if (body.returnNotes !== undefined) updateInput.returnNotes = body.returnNotes;
    if (body.damageNotes !== undefined) updateInput.damageNotes = body.damageNotes;

    // Update the order
    const updatedOrder = await updateOrder(orderId, updateInput, user.id);

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

// DELETE /api/orders/[id] - Cancel order
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const orderId = params.id;
    const body = await request.json();
    const reason = body.reason || 'Order cancelled by user';

    // Cancel the order
    const cancelledOrder = await cancelOrder(orderId, user.id, reason);

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