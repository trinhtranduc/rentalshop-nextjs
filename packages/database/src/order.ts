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
} from './types';

// Generate order number (e.g., ORD-2024-001)
export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `ORD-${year}-${timestamp}`;
}

// Create a new order with items
export async function createOrder(input: OrderInput, userId: string): Promise<OrderWithDetails> {
  const orderNumber = generateOrderNumber();
  
  return await prisma.$transaction(async (tx) => {
    // Create the order
    const order = await tx.order.create({
      data: {
        orderNumber,
        orderType: input.orderType,
        userId,
        customerId: input.customerId,
        outletId: input.outletId,
        pickupPlanAt: input.pickupPlanAt,
        returnPlanAt: input.returnPlanAt,
        subtotal: input.subtotal,
        taxAmount: input.taxAmount || 0,
        discountAmount: input.discountAmount || 0,
        totalAmount: input.totalAmount,
        depositAmount: input.depositAmount || 0,
        notes: input.notes,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
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
            deposit: item.deposit || 0,
            notes: item.notes,
            startDate: item.startDate,
            endDate: item.endDate,
            daysRented: item.daysRented,
          },
        })
      )
    );

    // Create order history entry
    await tx.orderHistory.create({
      data: {
        orderId: order.id,
        action: 'CREATED',
        notes: 'Order created',
        userId,
      },
    });

    // Update product stock if it's a rental
    if (input.orderType === 'RENT') {
      for (const item of input.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            renting: { increment: item.quantity },
            available: { decrement: item.quantity },
          },
        });
      }
    }

    // Return the complete order with details
    const result = await getOrderById(order.id);
    if (!result) {
      throw new Error('Failed to create order');
    }
    return result as OrderWithDetails;
  });
}

// Get order by ID with all details
export async function getOrderById(orderId: string): Promise<OrderWithDetails | null> {
  return await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
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
      orderHistory: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

// Get order by order number
export async function getOrderByNumber(orderNumber: string): Promise<OrderWithDetails | null> {
  return await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
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
      orderHistory: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

// Update order
export async function updateOrder(
  orderId: string,
  input: OrderUpdateInput,
  userId: string
): Promise<OrderWithDetails | null> {
  return await prisma.$transaction(async (tx) => {
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

    // Track changes in order history
    const changes: OrderHistoryInput[] = [];

    if (input.status && input.status !== currentOrder.status) {
      changes.push({
        orderId,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: currentOrder.status,
        newValue: input.status,
        userId,
      });
    }

    if (input.pickedUpAt && !currentOrder.pickedUpAt) {
      changes.push({
        orderId,
        action: 'PICKED_UP',
        field: 'pickedUpAt',
        newValue: input.pickedUpAt.toISOString(),
        userId,
      });
    }

    if (input.returnedAt && !currentOrder.returnedAt) {
      changes.push({
        orderId,
        action: 'RETURNED',
        field: 'returnedAt',
        newValue: input.returnedAt.toISOString(),
        userId,
      });

      // Update product stock when returned
      const orderItems = await tx.orderItem.findMany({
        where: { orderId },
      });

      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            renting: { decrement: item.quantity },
            available: { increment: item.quantity },
          },
        });
      }
    }

    // Create history entries
    await Promise.all(
      changes.map((change) =>
        tx.orderHistory.create({
          data: change,
        })
      )
    );

    return await getOrderById(orderId);
  });
}

// Search orders with filters
export async function searchOrders(filters: OrderSearchFilter): Promise<{
  orders: OrderSearchResult[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}> {
  const { limit = 20, offset = 0, ...searchFilters } = filters;

  const where: any = {};

  if (searchFilters.outletId) where.outletId = searchFilters.outletId;
  if (searchFilters.customerId) where.customerId = searchFilters.customerId;
  if (searchFilters.userId) where.userId = searchFilters.userId;
  if (searchFilters.orderType) where.orderType = searchFilters.orderType;
  if (searchFilters.status) where.status = searchFilters.status;
  if (searchFilters.startDate) where.createdAt = { gte: searchFilters.startDate };
  if (searchFilters.endDate) where.createdAt = { lte: searchFilters.endDate };
  if (searchFilters.pickupDate) where.pickupPlanAt = { gte: searchFilters.pickupDate };
  if (searchFilters.returnDate) where.returnPlanAt = { lte: searchFilters.returnDate };
  if (searchFilters.minAmount) where.totalAmount = { gte: searchFilters.minAmount };
  if (searchFilters.maxAmount) where.totalAmount = { lte: searchFilters.maxAmount };

  // Text search
  if (searchFilters.q) {
    where.OR = [
      { orderNumber: { contains: searchFilters.q, mode: 'insensitive' } },
      { customerName: { contains: searchFilters.q, mode: 'insensitive' } },
      { customerPhone: { contains: searchFilters.q, mode: 'insensitive' } },
      { customerEmail: { contains: searchFilters.q, mode: 'insensitive' } },
      { notes: { contains: searchFilters.q, mode: 'insensitive' } },
    ];
  }

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
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.order.count({ where }),
  ]);

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
      customer: order.customer,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      outlet: order.outlet,
      user: order.user,
    })),
    total,
    limit,
    offset,
    hasMore,
  };
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
      userId,
      amount: input.amount,
      method: input.method,
      type: input.type,
      reference: input.reference,
      notes: input.notes,
    },
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
export async function addOrderHistory(input: OrderHistoryInput) {
  return await prisma.orderHistory.create({
    data: input,
  });
}

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
      user: {
        select: {
          id: true,
          name: true,
        },
      },
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
    customer: order.customer,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    outlet: order.outlet,
    user: order.user,
  }));
}

// Cancel order
export async function cancelOrder(orderId: string, userId: string, reason?: string): Promise<OrderWithDetails | null> {
  return await prisma.$transaction(async (tx) => {
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
        await tx.product.update({
          where: { id: item.productId },
          data: {
            renting: { decrement: item.quantity },
            available: { increment: item.quantity },
          },
        });
      }
    }

    // Add to history
    await tx.orderHistory.create({
      data: {
        orderId,
        action: 'CANCELLED',
        notes: reason || 'Order cancelled',
        userId,
      },
    });

    return await getOrderById(orderId);
  });
}

// Delete order (soft delete by setting status to CANCELLED)
export async function deleteOrder(orderId: string, userId: string): Promise<void> {
  await cancelOrder(orderId, userId, 'Order deleted');
} 