import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyTokenSimple } from '@rentalshop/auth';
import { 
  createOrder, 
  searchOrders, 
  getOrderStats,
  getOrderById,
  updateOrder,
  cancelOrder
} from '@rentalshop/database';
import type { OrderInput, OrderSearchFilter, OrderUpdateInput } from '@rentalshop/database';
import { assertAnyRole, getUserScope } from '@rentalshop/auth';
import { ordersQuerySchema, orderCreateSchema, orderUpdateSchema } from '@rentalshop/utils';
import { prisma } from '@rentalshop/database';

/**
 * GET /api/orders
 * Get orders with filtering, pagination, and special operations
 * 
 * Query Parameters:
 * - Standard filters: q, outletId, customerId, userId, orderType, status, startDate, endDate
 * - Pagination: limit, offset
 * - Special operations:
 *   - orderId: Get specific order
 *   - productId: Get orders for specific product (for availability checking)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // If productId is provided, get orders for that specific product
    if (productId) {
      const orders = await prisma.order.findMany({
        where: {
          orderItems: {
            some: {
              productId: productId
            }
          }
        },
        include: {
          orderItems: {
            where: {
              productId: productId
            },
            include: {
              product: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      });

      return NextResponse.json({
        success: true,
        data: {
          orders: orders.map(order => ({
            id: order.id,
            orderType: order.orderType,
            status: order.status,
            pickupPlanAt: order.pickupPlanAt,
            returnPlanAt: order.returnPlanAt,
            orderItems: order.orderItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              name: item.product.name
            }))
          }))
        }
      });
    }

    // Default behavior - get all orders
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        outlet: true,
        orderItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    const total = await prisma.order.count();

    return NextResponse.json({
      success: true,
      data: {
        orders,
        total,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';

/**
 * POST /api/orders
 * Create new order
 */
export async function POST(request: NextRequest) {
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

    // Authorization: creating orders requires outlet team (OUTLET_ADMIN/OUTLET_STAFF) or ADMIN/MERCHANT
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
    } catch {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parsed = orderCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    // Create order input
    const p = parsed.data;
    const orderInput: OrderInput = {
      orderType: p.orderType,
      customerId: p.customerId,
      outletId: p.outletId,
      pickupPlanAt: p.pickupPlanAt,
      returnPlanAt: p.returnPlanAt,
      subtotal: p.subtotal,
      taxAmount: p.taxAmount,
      discountAmount: p.discountAmount,
      totalAmount: p.totalAmount,
      depositAmount: p.depositAmount,
      notes: p.notes,
      customerName: p.customerName,
      customerPhone: p.customerPhone,
      customerEmail: p.customerEmail,
      orderItems: p.orderItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        deposit: item.deposit,
        notes: item.notes,
        startDate: item.startDate,
        endDate: item.endDate,
        daysRented: item.daysRented,
      })),
    };

    // Create the order
    const order = await createOrder(orderInput, user.id);

    return NextResponse.json({
      success: true,
      data: order,
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/orders
 * Update order (requires orderId in query params)
 */
export async function PUT(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    // Authorization: updating orders requires outlet team or merchant/admin
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
    } catch {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const parsed = orderUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const u = parsed.data;
    const updateInput: OrderUpdateInput = {
      ...(u.status !== undefined && { status: u.status as any }),
      ...(u.pickupPlanAt !== undefined && { pickupPlanAt: u.pickupPlanAt }),
      ...(u.returnPlanAt !== undefined && { returnPlanAt: u.returnPlanAt }),
      ...(u.pickedUpAt !== undefined && { pickedUpAt: u.pickedUpAt }),
      ...(u.returnedAt !== undefined && { returnedAt: u.returnedAt }),
      ...(u.subtotal !== undefined && { subtotal: u.subtotal }),
      ...(u.taxAmount !== undefined && { taxAmount: u.taxAmount }),
      ...(u.discountAmount !== undefined && { discountAmount: u.discountAmount }),
      ...(u.totalAmount !== undefined && { totalAmount: u.totalAmount }),
      ...(u.depositAmount !== undefined && { depositAmount: u.depositAmount }),
      ...(u.damageFee !== undefined && { damageFee: u.damageFee }),
      ...(u.notes !== undefined && { notes: u.notes }),
      ...(u.pickupNotes !== undefined && { pickupNotes: u.pickupNotes }),
      ...(u.returnNotes !== undefined && { returnNotes: u.returnNotes }),
      ...(u.damageNotes !== undefined && { damageNotes: u.damageNotes }),
    };

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

/**
 * DELETE /api/orders
 * Cancel order (requires orderId in query params)
 */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    // Authorization: cancelling orders requires outlet team or merchant/admin
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
    } catch {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
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