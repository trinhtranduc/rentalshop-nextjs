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
import type { OrderInput, OrderSearchFilter, OrderUpdateInput, OrderType, OrderStatus } from '@rentalshop/types';
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
    
    // Extract search filters from query parameters
    const q = searchParams.get('q');
    const orderType = searchParams.get('orderType');
    const status = searchParams.get('status');
    const outletId = searchParams.get('outletId');
    const customerId = searchParams.get('customerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder');

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
                      publicId: true,
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
            id: order.publicId,                    // Return publicId as "id" to frontend
            orderNumber: order.orderNumber,
            orderType: order.orderType,
            status: order.status,
            pickupPlanAt: order.pickupPlanAt,
            returnPlanAt: order.returnPlanAt,
            orderItems: order.orderItems.map(item => ({
              productId: item.product.publicId,    // Product public ID
              quantity: item.quantity,
              name: item.product.name
            }))
            // DO NOT include order.id (internal CUID)
          }))
        }
      });
    }

    // Build search filters
    const searchFilters: OrderSearchFilter = {
      limit,
      offset,
      ...(q && { q }),
      ...(orderType && { orderType: orderType as OrderType }),
      ...(status && { status: status as OrderStatus }),
      ...(outletId && { outletId }),
      ...(customerId && { customerId }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
      ...(sortBy && { sortBy }),
      ...(sortOrder && { sortOrder: sortOrder as 'asc' | 'desc' }),
    };

    // Use the searchOrders function for proper filtering and pagination
    const result = await searchOrders(searchFilters);
    
    // Calculate total pages for frontend pagination
    const totalPages = Math.ceil(result.total / limit);

    return NextResponse.json({
      success: true,
      data: {
        orders: result.orders,
        total: result.total,
        totalPages,
        hasMore: result.hasMore,
        currentPage: Math.floor(offset / limit) + 1
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
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Authorization: creating orders requires outlet team (OUTLET_ADMIN/OUTLET_STAFF) or ADMIN/MERCHANT
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
    } catch {
      return NextResponse.json({ 
        success: false, 
        message: 'Insufficient permissions to create orders',
        error: 'FORBIDDEN'
      }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json();
    console.log('🔍 Received order creation request:', JSON.stringify(body, null, 2));
    
    const parsed = orderCreateSchema.safeParse(body);
    if (!parsed.success) {
      console.error('❌ Validation failed:', parsed.error.flatten());
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid order data',
        error: 'VALIDATION_ERROR',
        details: parsed.error.flatten()
      }, { status: 400 });
    }
    
    console.log('✅ Validation passed');

    // Create order input with proper mapping
    const p = parsed.data;
    const orderInput: OrderInput = {
      orderType: p.orderType,
      customerId: p.customerId,
      outletId: p.outletId,
      pickupPlanAt: p.pickupPlanAt,
      returnPlanAt: p.returnPlanAt,
      rentalDuration: p.rentalDuration,
      subtotal: p.subtotal,
      taxAmount: p.taxAmount,
      discountAmount: p.discountAmount,
      totalAmount: p.totalAmount,
      depositAmount: p.depositAmount,
      securityDeposit: p.securityDeposit,
      damageFee: p.damageFee,
      lateFee: p.lateFee,
      collateralType: p.collateralType,
      collateralDetails: p.collateralDetails,
      notes: p.notes,
      pickupNotes: p.pickupNotes,
      returnNotes: p.returnNotes,
      damageNotes: p.damageNotes,
      customerName: p.customerName,
      customerPhone: p.customerPhone,
      customerEmail: p.customerEmail,
      isReadyToDeliver: p.isReadyToDeliver,
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

    console.log('🔍 Creating order with input:', JSON.stringify(orderInput, null, 2));

    // Additional business logic validation
    if (orderInput.orderType === 'RENT') {
      if (!orderInput.pickupPlanAt || !orderInput.returnPlanAt) {
        return NextResponse.json({
          success: false,
          message: 'Rental orders require both pickup and return dates',
          error: 'MISSING_RENTAL_DATES'
        }, { status: 400 });
      }
      
      if (orderInput.pickupPlanAt >= orderInput.returnPlanAt) {
        return NextResponse.json({
          success: false,
          message: 'Pickup date must be before return date',
          error: 'INVALID_DATE_RANGE'
        }, { status: 400 });
      }

      // Calculate rental duration in days
      const rentalDurationMs = orderInput.returnPlanAt.getTime() - orderInput.pickupPlanAt.getTime();
      const rentalDurationDays = Math.ceil(rentalDurationMs / (1000 * 60 * 60 * 24));
      
      // Validate rental duration if provided
      if (orderInput.rentalDuration && orderInput.rentalDuration !== rentalDurationDays) {
        return NextResponse.json({
          success: false,
          message: `Rental duration (${orderInput.rentalDuration} days) does not match pickup/return date range (${rentalDurationDays} days)`,
          error: 'RENTAL_DURATION_MISMATCH'
        }, { status: 400 });
      }

      // Set rental duration if not provided
      if (!orderInput.rentalDuration) {
        orderInput.rentalDuration = rentalDurationDays;
      }
    }

    if (orderInput.totalAmount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Order total amount must be greater than zero',
        error: 'INVALID_AMOUNT'
      }, { status: 400 });
    }

    if (orderInput.depositAmount && orderInput.depositAmount > orderInput.totalAmount) {
      return NextResponse.json({
        success: false,
        message: 'Deposit amount cannot exceed total amount',
        error: 'INVALID_DEPOSIT'
      }, { status: 400 });
    }

    // Validate additional financial fields
    if (orderInput.securityDeposit && orderInput.securityDeposit < 0) {
      return NextResponse.json({
        success: false,
        message: 'Security deposit cannot be negative',
        error: 'INVALID_SECURITY_DEPOSIT'
      }, { status: 400 });
    }

    if (orderInput.damageFee && orderInput.damageFee < 0) {
      return NextResponse.json({
        success: false,
        message: 'Damage fee cannot be negative',
        error: 'INVALID_DAMAGE_FEE'
      }, { status: 400 });
    }

    if (orderInput.lateFee && orderInput.lateFee < 0) {
      return NextResponse.json({
        success: false,
        message: 'Late fee cannot be negative',
        error: 'INVALID_LATE_FEE'
      }, { status: 400 });
    }

    // Validate order items
    if (!orderInput.orderItems || orderInput.orderItems.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Order must contain at least one item',
        error: 'NO_ORDER_ITEMS'
      }, { status: 400 });
    }

    // Validate each order item
    for (const item of orderInput.orderItems) {
      if (item.quantity <= 0) {
        return NextResponse.json({
          success: false,
          message: `Quantity for product ${item.productId} must be greater than zero`,
          error: 'INVALID_QUANTITY'
        }, { status: 400 });
      }

      if (item.unitPrice < 0) {
        return NextResponse.json({
          success: false,
          message: `Unit price for product ${item.productId} cannot be negative`,
          error: 'INVALID_UNIT_PRICE'
        }, { status: 400 });
      }

      if (item.totalPrice < 0) {
        return NextResponse.json({
          success: false,
          message: `Total price for product ${item.productId} cannot be negative`,
          error: 'INVALID_TOTAL_PRICE'
        }, { status: 400 });
      }

      if (item.deposit && item.deposit < 0) {
        return NextResponse.json({
          success: false,
          message: `Deposit for product ${item.productId} cannot be negative`,
          error: 'INVALID_ITEM_DEPOSIT'
        }, { status: 400 });
      }

      // Validate that total price matches quantity * unit price
      const calculatedTotalPrice = item.quantity * item.unitPrice;
      if (Math.abs(item.totalPrice - calculatedTotalPrice) > 0.01) { // Allow for small floating point differences
        return NextResponse.json({
          success: false,
          message: `Total price for product ${item.productId} (${item.totalPrice}) does not match quantity (${item.quantity}) × unit price (${item.unitPrice}) = ${calculatedTotalPrice}`,
          error: 'PRICE_CALCULATION_MISMATCH'
        }, { status: 400 });
      }
    }

    // Validate that subtotal matches sum of order items
    const calculatedSubtotal = orderInput.orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    if (Math.abs(orderInput.subtotal - calculatedSubtotal) > 0.01) {
      return NextResponse.json({
        success: false,
        message: `Subtotal (${orderInput.subtotal}) does not match sum of order items (${calculatedSubtotal})`,
        error: 'SUBTOTAL_MISMATCH'
      }, { status: 400 });
    }

    // Validate that total amount matches subtotal + tax - discount
    const calculatedTotal = orderInput.subtotal + (orderInput.taxAmount || 0) - (orderInput.discountAmount || 0);
    if (Math.abs(orderInput.totalAmount - calculatedTotal) > 0.01) {
      return NextResponse.json({
        success: false,
        message: `Total amount (${orderInput.totalAmount}) does not match subtotal (${orderInput.subtotal}) + tax (${orderInput.taxAmount || 0}) - discount (${orderInput.discountAmount || 0}) = ${calculatedTotal}`,
        error: 'TOTAL_AMOUNT_MISMATCH'
      }, { status: 400 });
    }

    // Validate that user has access to the specified outlet
    const userScope = getUserScope(user as any);
    if (userScope.outletId && userScope.outletId !== orderInput.outletId) {
      return NextResponse.json({
        success: false,
        message: 'You can only create orders for your assigned outlet',
        error: 'OUTLET_ACCESS_DENIED'
      }, { status: 403 });
    }

    if (userScope.merchantId) {
      // For MERCHANT role, verify the outlet belongs to their merchant
      const outlet = await prisma.outlet.findUnique({
        where: { id: orderInput.outletId },
        select: { merchantId: true }
      });
      
      if (!outlet || outlet.merchantId !== userScope.merchantId) {
        return NextResponse.json({
          success: false,
          message: 'You can only create orders for outlets in your merchant organization',
          error: 'MERCHANT_ACCESS_DENIED'
        }, { status: 403 });
      }
    }

    console.log('🔍 User authorization validated for outlet:', orderInput.outletId);

    // Create the order
    const order = await createOrder(orderInput, user.id);
    
    console.log('✅ Order created successfully:', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      totalAmount: order.totalAmount,
      customerId: order.customerId,
      outletId: order.outletId
    });

    return NextResponse.json({
      success: true,
      data: order,
      message: `Order ${order.orderNumber} created successfully`,
      orderNumber: order.orderNumber,
      orderId: order.id
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating order:', error);
    
    // Handle specific database errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint failed')) {
        return NextResponse.json({
          success: false,
          message: 'Order with this number already exists',
          error: 'DUPLICATE_ORDER'
        }, { status: 409 });
      }
      
      if (error.message.includes('Foreign key constraint failed')) {
        if (error.message.includes('customerId')) {
          return NextResponse.json({
            success: false,
            message: 'Customer not found',
            error: 'CUSTOMER_NOT_FOUND'
          }, { status: 400 });
        }
        
        if (error.message.includes('outletId')) {
          return NextResponse.json({
            success: false,
            message: 'Outlet not found',
            error: 'OUTLET_NOT_FOUND'
          }, { status: 400 });
        }
        
        if (error.message.includes('productId')) {
          return NextResponse.json({
            success: false,
            message: 'One or more products not found',
            error: 'PRODUCT_NOT_FOUND'
          }, { status: 400 });
        }
      }
      
      if (error.message.includes('Insufficient stock')) {
        return NextResponse.json({
          success: false,
          message: 'Insufficient stock for one or more products',
          error: 'INSUFFICIENT_STOCK'
        }, { status: 400 });
      }

      if (error.message.includes('Product not available')) {
        return NextResponse.json({
          success: false,
          message: 'One or more products are not available for rental/sale',
          error: 'PRODUCT_NOT_AVAILABLE'
        }, { status: 400 });
      }

      if (error.message.includes('Invalid order type')) {
        return NextResponse.json({
          success: false,
          message: 'Invalid order type specified',
          error: 'INVALID_ORDER_TYPE'
        }, { status: 400 });
      }

      if (error.message.includes('Invalid date range')) {
        return NextResponse.json({
          success: false,
          message: 'Invalid pickup or return date range',
          error: 'INVALID_DATE_RANGE'
        }, { status: 400 });
      }
    }
    
    return NextResponse.json({
      success: false,
      message: 'Failed to create order. Please try again.',
      error: 'INTERNAL_ERROR'
    }, { status: 500 });
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