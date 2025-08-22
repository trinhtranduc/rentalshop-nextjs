import { prisma } from './client';
import type {
  OrderInput,
  OrderItemInput,
  OrderUpdateInput,
  OrderFilters,
  OrderSearchFilter,
  OrderWithDetails,
  OrderSearchResult,
  PaymentInput,
  OrderHistoryInput,
  OrderStats,
  OrderType,
  OrderStatus,
} from '@rentalshop/types';

// Generate order number (e.g., 2024-001)
export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `${year}-${timestamp}`;
}

// Create a new order with items
export async function createOrder(input: OrderInput, userId: string): Promise<OrderWithDetails> {
  const orderNumber = generateOrderNumber();
  
  // Get the next public ID for orders
  const lastOrder = await prisma.order.findFirst({
    orderBy: { publicId: 'desc' }
  });
  const nextPublicId = (lastOrder?.publicId || 0) + 1;
  
  const createdOrderId = await prisma.$transaction(async (tx: any) => {
    // Create the order
    const order = await tx.order.create({
      data: {
        publicId: nextPublicId,
        orderNumber,
        orderType: input.orderType,
        customerId: input.customerId,
        outletId: input.outletId,
        pickupPlanAt: input.pickupPlanAt,
        returnPlanAt: input.returnPlanAt,
        totalAmount: input.totalAmount,
        depositAmount: input.depositAmount || 0,
        isReadyToDeliver: input.isReadyToDeliver || false, // Default to false
      },
    });

    // Create order items
    const orderItems = await Promise.all(
      input.orderItems.map((item: OrderItemInput) =>
        tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          // startDate/endDate/daysRented removed from schema
          },
        })
      )
    );

    // Note: OrderHistory model removed in new schema; skip history creation

    // Update product stock if it's a rental
    if (input.orderType === 'RENT') {
      for (const item of input.orderItems) {
        await tx.outletStock.upsert({
          where: {
            productId_outletId: {
              productId: item.productId,
              outletId: input.outletId,
            },
          },
          update: {
            renting: { increment: item.quantity },
            available: { decrement: item.quantity },
          },
          create: {
            productId: item.productId,
            outletId: input.outletId,
            stock: 0,
            available: 0,
            renting: item.quantity,
          },
        });
      }
    }

    return order.id;
  });

  // Fetch the complete order with details after commit
  const result = await getOrderById(createdOrderId);
  if (!result) {
    throw new Error('Failed to create order');
  }
  return result as OrderWithDetails;
}

// Get order by ID with all details
export async function getOrderById(orderId: string): Promise<OrderWithDetails | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      // user removed from includes to match new schema
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      outlet: {
        select: {
          id: true,
          name: true,
          address: true,
          merchantId: true,
          merchant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      orderItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              images: true,
              barcode: true,
            },
          },
        },
      },
      payments: true,
      // orderHistory removed in new schema
    },
  });

  if (!order) return null;

  // Transform the data to match OrderWithDetails interface
  return {
    ...order,
    merchantId: order.outlet.merchantId,
  } as OrderWithDetails;
}

// Get order by order number
export async function getOrderByNumber(orderNumber: string): Promise<OrderWithDetails | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      // user removed from includes to match new schema
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      outlet: {
        select: {
          id: true,
          name: true,
          address: true,
          merchantId: true,
          merchant: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      orderItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              images: true,
              barcode: true,
            },
          },
        },
      },
      payments: true,
      // orderHistory removed in new schema
    },
  });

  if (!order) return null;

  // Transform the data to match OrderWithDetails interface
  return {
    ...order,
    merchantId: order.outlet.merchantId,
  } as OrderWithDetails;
}

// Update order
export async function updateOrder(
  orderId: string,
  input: OrderUpdateInput,
  userId: string
): Promise<OrderWithDetails | null> {
  const updatedOrderId = await prisma.$transaction(async (tx: any) => {
    // Get current order to track changes
    const currentOrder = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!currentOrder) {
      throw new Error('Order not found');
    }

    // Update the order
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: input,
    });

    // OrderHistory removed; skip tracking changes

    // (No history persistence)

    // (No history persistence)

    if (input.returnedAt && !currentOrder.returnedAt) {
      // Update outlet stock when returned
      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
      });

      for (const item of orderItems) {
        await tx.outletStock.upsert({
          where: {
            productId_outletId: {
              productId: item.productId,
              outletId: currentOrder.outletId,
            },
          },
          update: {
            renting: { decrement: item.quantity },
            available: { increment: item.quantity },
          },
          create: {
            productId: item.productId,
            outletId: currentOrder.outletId,
            stock: 0,
            available: item.quantity,
            renting: 0,
          },
        });
      }
    }

    // No history entries

    return orderId;
  });

  return await getOrderById(updatedOrderId);
}

// Search orders with filters
export async function searchOrders(filters: OrderSearchFilter): Promise<{
  orders: OrderSearchResult[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}> {
  try {
    console.log('🔍 searchOrders called with filters:', JSON.stringify(filters, null, 2));
    
    const { limit = 20, offset = 0, ...searchFilters } = filters;

    const where: any = {};

    if (searchFilters.outletId) where.outletId = searchFilters.outletId;
    if (searchFilters.customerId) where.customerId = searchFilters.customerId;
    if (searchFilters.userId) where.userId = searchFilters.userId;
    if (searchFilters.orderType) where.orderType = searchFilters.orderType;
    if (searchFilters.status) where.status = searchFilters.status;
    // For calendar filtering, use pickup/return dates instead of creation dates
    if (searchFilters.startDate) where.pickupPlanAt = { gte: searchFilters.startDate };
    if (searchFilters.endDate) where.pickupPlanAt = { lte: searchFilters.endDate };
    if (searchFilters.pickupDate) where.pickupPlanAt = { gte: searchFilters.pickupDate };
    if (searchFilters.returnDate) where.returnPlanAt = { lte: searchFilters.returnDate };
    if (searchFilters.minAmount) where.totalAmount = { gte: searchFilters.minAmount };
    if (searchFilters.maxAmount) where.totalAmount = { lte: searchFilters.maxAmount };
    if (searchFilters.isReadyToDeliver !== undefined) where.isReadyToDeliver = searchFilters.isReadyToDeliver;

    // Text search
    if (searchFilters.q) {
      where.OR = [
        { orderNumber: { contains: searchFilters.q } },
        // Search through customer relations instead of non-existent fields
        { customer: { 
          OR: [
            { firstName: { contains: searchFilters.q } },
            { lastName: { contains: searchFilters.q } },
            { phone: { contains: searchFilters.q } },
            { email: { contains: searchFilters.q } }
          ]
        } },
        // Search through product names in order items
        { orderItems: { 
          some: {
            product: {
              OR: [
                { name: { contains: searchFilters.q } },
                { barcode: { contains: searchFilters.q } }
              ]
            }
          }
        } }
      ];
    }

    console.log('🔍 searchOrders where clause:', JSON.stringify(where, null, 2));

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          outlet: {
            select: {
              id: true,
              name: true,
            },
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                },
              },
            },
          },
          // user removed
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({ where }),
    ]);

    console.log('🔍 searchOrders found orders:', orders.length, 'total:', total);

    const hasMore = offset + limit < total;

    return {
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType as OrderType,
        status: order.status as OrderStatus,
        totalAmount: order.totalAmount,
        depositAmount: order.depositAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        pickupPlanAt: order.pickupPlanAt,
        returnPlanAt: order.returnPlanAt,
        pickedUpAt: order.pickedUpAt,
        returnedAt: order.returnedAt,
        isReadyToDeliver: order.isReadyToDeliver,
        customer: order.customer,
        outlet: order.outlet,
        orderItems: order.orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          product: {
            name: item.product.name,
            barcode: item.product.barcode,
          },
        })),
      })),
      total,
      limit,
      offset,
      hasMore,
    };
  } catch (error) {
    console.error('🔍 searchOrders error:', error);
    throw error;
  }
}

// Get order statistics
export async function getOrderStats(outletId?: string): Promise<OrderStats> {
  const where: any = {};
  if (outletId) where.outletId = outletId;

  const [
    totalOrders,
    totalRevenue,
    totalDeposits,
    activeRentals,
    overdueRentals,
    completedOrders,
    cancelledOrders,
  ] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.aggregate({
      where: { ...where, status: { in: ['COMPLETED', 'ACTIVE'] } },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { ...where, status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] } },
      _sum: { depositAmount: true },
    }),
    prisma.order.count({
      where: { ...where, status: 'ACTIVE', orderType: 'RENT' },
    }),
    prisma.order.count({
      where: {
        ...where,
        status: 'ACTIVE',
        orderType: 'RENT',
        returnPlanAt: { lt: new Date() },
      },
    }),
    prisma.order.count({
      where: { ...where, status: 'COMPLETED' },
    }),
    prisma.order.count({
      where: { ...where, status: 'CANCELLED' },
    }),
  ]);

  const averageOrderValue = totalOrders > 0 ? (totalRevenue._sum.totalAmount || 0) / totalOrders : 0;

  return {
    totalOrders,
    totalRevenue: totalRevenue._sum.totalAmount || 0,
    totalDeposits: totalDeposits._sum.depositAmount || 0,
    activeRentals,
    overdueRentals,
    completedOrders,
    cancelledOrders,
    averageOrderValue,
  };
}

// Create payment
export async function createPayment(input: PaymentInput, userId: string) {
  return await prisma.payment.create({
    data: {
      orderId: input.orderId,
      amount: input.amount,
      method: input.method,
      type: input.type,
      reference: input.reference,
      notes: input.notes,
    } as any, // Type assertion to bypass Prisma type mismatch
  });
}

// Get payments for an order
export async function getOrderPayments(orderId: string) {
  return await prisma.payment.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });
}

// Add order history entry
// Order history removed in new schema

// Get overdue rentals
export async function getOverdueRentals(outletId?: string): Promise<OrderSearchResult[]> {
  const where: any = {
    status: 'ACTIVE',
    orderType: 'RENT',
    returnPlanAt: { lt: new Date() },
  };

  if (outletId) where.outletId = outletId;

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      outlet: {
        select: {
          id: true,
          name: true,
        },
      },
      // user removed
    },
    orderBy: { returnPlanAt: 'asc' },
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType as OrderType,
    status: order.status as OrderStatus,
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    pickupPlanAt: order.pickupPlanAt,
    returnPlanAt: order.returnPlanAt,
    pickedUpAt: order.pickedUpAt,
    returnedAt: order.returnedAt,
    isReadyToDeliver: order.isReadyToDeliver,
    customer: order.customer,
    outlet: order.outlet,
  }));
}

// Cancel order
export async function cancelOrder(orderId: string, userId: string, reason?: string): Promise<OrderWithDetails | null> {
  const cancelledOrderId = await prisma.$transaction(async (tx: any) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === 'CANCELLED') {
      throw new Error('Order is already cancelled');
    }

    // Update order status
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    // Restore product stock if it was a rental
    if (order.orderType === 'RENT' && order.status === 'ACTIVE') {
      for (const item of order.orderItems) {
        await tx.outletStock.upsert({
          where: {
            productId_outletId: {
              productId: item.productId,
              outletId: order.outletId,
            },
          },
          update: {
            renting: { decrement: item.quantity },
            available: { increment: item.quantity },
          },
          create: {
            productId: item.productId,
            outletId: order.outletId,
            stock: 0,
            available: item.quantity,
            renting: 0,
          },
        });
      }
    }

    // No history in new schema

    return orderId;
  });

  return await getOrderById(cancelledOrderId);
}

// Delete order (soft delete by setting status to CANCELLED)
export async function deleteOrder(orderId: string, userId: string): Promise<void> {
  await cancelOrder(orderId, userId, 'Order deleted');
} 