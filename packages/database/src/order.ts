// ============================================================================
// SINGLE ID ORDER FUNCTIONS
// ============================================================================
// This file contains order functions that use single ID system:
// - Input: id (number)
// - Database: queries by id (integer), uses integer IDs for relationships
// - Return: includes id (number)

import { prisma } from './client';
import type { 
  OrderInput, 
  OrderUpdateInput, 
  OrderSearchFilter,
  OrderWithDetails,
  OrderSearchResult,
  OrderSearchResponse
} from '@rentalshop/types';

// ============================================================================
// ORDER LOOKUP FUNCTIONS (BY ID)
// ============================================================================

/**
 * Get order by id (number) with all details - follows single ID system
 */
export async function getOrderById(id: number): Promise<OrderWithDetails | null> {
  // Validate id is provided and is a positive number
  if (!id || id <= 0) {
    throw new Error('Invalid order ID: ID must be a positive number');
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      // Include all basic order fields
      id: true,
      orderNumber: true,
      orderType: true,
      status: true,
      customerId: true,
      outletId: true,
      createdById: true,
      totalAmount: true,
      depositAmount: true,
      pickupPlanAt: true,
      returnPlanAt: true,
      pickedUpAt: true,
      returnedAt: true,
      damageFee: true,
      bailAmount: true,
      material: true,
      securityDeposit: true,
      collateralType: true,
      collateralDetails: true,
      notes: true,
      discountType: true,
      discountValue: true,
      discountAmount: true,
      createdAt: true,
      updatedAt: true,
      
      // Include customer details
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        }
        },
      
      // Include outlet details
      outlet: {
        select: {
          id: true,
          name: true,
          address: true,
                    phone: true,
        }
      },
      
      // Include order items with product details
      orderItems: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          deposit: true,
          rentalDays: true,
          notes: true,
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              images: true,
              barcode: true,
              rentPrice: true,
              deposit: true,
            }
          }
        }
      },
      
      // Include payments
      payments: {
          select: {
            id: true,
          amount: true,
          method: true,
          status: true,
          createdAt: true,
        }
      },
      
      // Include created by user
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
        }
      },
      
      // Include merchant details
                            merchant: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
        }
      }
    }
  });

  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    customerId: order.customerId,
    outletId: order.outletId,
    createdById: order.createdById,
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount,
    pickupPlanAt: order.pickupPlanAt,
    returnPlanAt: order.returnPlanAt,
    pickedUpAt: order.pickedUpAt,
    returnedAt: order.returnedAt,
    damageFee: order.damageFee,
    bailAmount: order.bailAmount,
    material: order.material,
    securityDeposit: order.securityDeposit,
    collateralType: order.collateralType,
    collateralDetails: order.collateralDetails,
    notes: order.notes,
    discountType: order.discountType,
    discountValue: order.discountValue,
    discountAmount: order.discountAmount,
    merchantId: order.merchant?.id || 0,
    customer: order.customer ? {
      id: order.customer.id,
      name: `${order.customer.firstName} ${order.customer.lastName}`,
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      email: order.customer.email,
      phone: order.customer.phone,
    } : undefined,
        outlet: {
      id: order.outlet.id,
      name: order.outlet.name,
      merchantId: order.merchant?.id || 0,
    },
    orderItems: order.orderItems.map((item: any) => ({
      id: item.id,
      orderId: order.id,
      productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      deposit: item.deposit,
      rentalDays: item.rentalDays,
      notes: item.notes,
          product: {
        id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        images: item.product.images,
        barcode: item.product.barcode,
        rentPrice: item.product.rentPrice,
        deposit: item.product.deposit,
      }
    })),
    payments: order.payments.map((payment: any) => ({
      id: payment.id,
      orderId: order.id,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      createdAt: payment.createdAt,
    })),
    createdBy: order.createdBy ? {
      id: order.createdBy.id,
      name: `${order.createdBy.firstName} ${order.createdBy.lastName}`,
      email: order.createdBy.email,
      role: 'OUTLET_STAFF', // Default role, should be fetched from user data
    } : undefined,
    merchant: {
      id: order.merchant?.id || 0,
      name: order.merchant?.name || '',
      email: order.merchant?.email || '',
    },
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/**
 * Search orders with filters - follows single ID system
 */
export async function searchOrders(filters: OrderSearchFilter): Promise<OrderSearchResponse> {
  const {
    q,
    outletId,
    customerId,
    userId,
    orderType,
    status,
    startDate,
    endDate,
    pickupDate,
    returnDate,
    limit = 20
  } = filters;
  
  const page = 1; // Default page

  const where: any = {};

  // Text search
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { customer: { firstName: { contains: q, mode: 'insensitive' } } },
      { customer: { lastName: { contains: q, mode: 'insensitive' } } },
      { customer: { phone: { contains: q, mode: 'insensitive' } } },
    ];
  }

  // Filter by outlet
  if (outletId) {
    where.outletId = outletId;
  }

  // Filter by customer
  if (customerId) {
    where.customerId = customerId;
  }

  // Filter by user (created by)
  if (userId) {
    where.createdById = userId;
  }

  // Filter by order type
  if (orderType) {
    where.orderType = orderType;
  }

  // Filter by status
  if (status) {
    where.status = status;
  }

  // Date filters
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  if (pickupDate) {
    where.pickupPlanAt = {
      gte: new Date(pickupDate),
      lt: new Date(new Date(pickupDate).getTime() + 24 * 60 * 60 * 1000)
    };
  }

  if (returnDate) {
    where.returnPlanAt = {
      gte: new Date(returnDate),
      lt: new Date(new Date(returnDate).getTime() + 24 * 60 * 60 * 1000)
    };
  }

  const offset = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        pickedUpAt: true,
        returnedAt: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          }
        },
        outlet: {
          select: {
            id: true,
            name: true,
          }
        },
        orderItems: {
          select: {
            id: true,
            productId: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              images: true,
              barcode: true,
              rentPrice: true,
              deposit: true,
              }
            }
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            createdAt: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.order.count({ where })
  ]);

  const results: OrderSearchResult[] = orders.map((order: any) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount,
    pickupPlanAt: order.pickupPlanAt,
    returnPlanAt: order.returnPlanAt,
    pickedUpAt: order.pickedUpAt,
    returnedAt: order.returnedAt,
    isReadyToDeliver: order.status === 'PICKUPED' && order.returnPlanAt && new Date(order.returnPlanAt) <= new Date(),
    customer: order.customer ? {
      id: order.customer.id,
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      email: order.customer.email,
      phone: order.customer.phone,
    } : null,
    outlet: {
      id: order.outlet.id,
      name: order.outlet.name,
    },
    orderItems: order.orderItems.map((item: any) => ({
      id: item.id,
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      product: {
        id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        images: item.product.images,
        barcode: item.product.barcode,
        rentPrice: item.product.rentPrice,
        deposit: item.product.deposit,
      }
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }));

  return {
    success: true,
    data: {
      orders: results,
      total,
      page,
      limit,
      offset,
      totalPages: Math.ceil(total / limit),
      hasMore: offset + limit < total,
    }
  };
}

/**
 * Create new order - follows single ID system
 */
export async function createOrder(orderData: OrderInput): Promise<OrderWithDetails> {
  const order = await prisma.order.create({
    data: {
      orderNumber: orderData.orderNumber,
      orderType: orderData.orderType,
      status: orderData.status || 'RESERVED',
      customerId: orderData.customerId,
      outletId: orderData.outletId,
      createdById: orderData.createdById,
      totalAmount: orderData.totalAmount,
      depositAmount: orderData.depositAmount || 0,
      pickupPlanAt: orderData.pickupPlanAt,
      returnPlanAt: orderData.returnPlanAt,
      damageFee: orderData.damageFee,
      bailAmount: orderData.bailAmount,
      material: orderData.material,
      securityDeposit: orderData.securityDeposit,
      collateralType: orderData.collateralType,
      collateralDetails: orderData.collateralDetails,
      notes: orderData.notes,
      discountType: orderData.discountType,
      discountValue: orderData.discountValue,
      discountAmount: orderData.discountAmount,
      orderItems: {
        create: orderData.orderItems?.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          deposit: item.deposit,
          rentalDays: item.rentalDays,
          notes: item.notes,
        })) || []
      }
    },
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

  // Return the created order with proper typing
  return getOrderById(order.id) as Promise<OrderWithDetails>;
}

/**
 * Update order - follows single ID system
 */
export async function updateOrder(id: number, orderData: OrderUpdateInput): Promise<OrderWithDetails | null> {
  // Validate id is provided and is a positive number
  if (!id || id <= 0) {
    throw new Error('Invalid order ID: ID must be a positive number');
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      orderType: orderData.orderType,
      status: orderData.status,
      customerId: orderData.customerId,
      outletId: orderData.outletId,
      totalAmount: orderData.totalAmount,
      depositAmount: orderData.depositAmount,
      pickupPlanAt: orderData.pickupPlanAt,
      returnPlanAt: orderData.returnPlanAt,
      pickedUpAt: orderData.pickedUpAt,
      returnedAt: orderData.returnedAt,
      damageFee: orderData.damageFee,
      bailAmount: orderData.bailAmount,
      material: orderData.material,
      securityDeposit: orderData.securityDeposit,
      collateralType: orderData.collateralType,
      collateralDetails: orderData.collateralDetails,
      notes: orderData.notes,
      discountType: orderData.discountType,
      discountValue: orderData.discountValue,
      discountAmount: orderData.discountAmount,
    }
  });

  return getOrderById(order.id);
}

/**
 * Delete order - follows single ID system
 */
export async function deleteOrder(id: number): Promise<boolean> {
  // Validate id is provided and is a positive number
  if (!id || id <= 0) {
    throw new Error('Invalid order ID: ID must be a positive number');
  }

  try {
    await prisma.order.delete({
      where: { id }
    });
    return true;
  } catch (error) {
    console.error('Error deleting order:', error);
    return false;
  }
}

/**
 * Get order by order number - follows single ID system
 */
export async function getOrderByNumber(orderNumber: string): Promise<OrderWithDetails | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      orderNumber: true,
      orderType: true,
      status: true,
      customerId: true,
      outletId: true,
      createdById: true,
      totalAmount: true,
      depositAmount: true,
      pickupPlanAt: true,
      returnPlanAt: true,
      pickedUpAt: true,
      returnedAt: true,
      damageFee: true,
      bailAmount: true,
      material: true,
      securityDeposit: true,
      collateralType: true,
      collateralDetails: true,
      notes: true,
      discountType: true,
      discountValue: true,
      discountAmount: true,
      createdAt: true,
      updatedAt: true,
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        }
      },
      outlet: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
        }
      },
      orderItems: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          deposit: true,
          rentalDays: true,
          notes: true,
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              images: true,
              barcode: true,
              rentPrice: true,
              deposit: true,
            }
          }
        }
      },
      payments: {
        select: {
          id: true,
          amount: true,
          method: true,
          status: true,
          createdAt: true,
        }
      },
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        }
      },
      merchant: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  });

  if (!order) return null;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    customerId: order.customerId,
    outletId: order.outletId,
    createdById: order.createdById,
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount,
    pickupPlanAt: order.pickupPlanAt,
    returnPlanAt: order.returnPlanAt,
    pickedUpAt: order.pickedUpAt,
    returnedAt: order.returnedAt,
    damageFee: order.damageFee,
    bailAmount: order.bailAmount,
    material: order.material,
    securityDeposit: order.securityDeposit,
    collateralType: order.collateralType,
    collateralDetails: order.collateralDetails,
    notes: order.notes,
    discountType: order.discountType,
    discountValue: order.discountValue,
    discountAmount: order.discountAmount,
    merchantId: order.merchant?.id || 0,
    customer: order.customer ? {
      id: order.customer.id,
      name: `${order.customer.firstName} ${order.customer.lastName}`,
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      email: order.customer.email,
      phone: order.customer.phone,
    } : undefined,
    outlet: {
      id: order.outlet.id,
      name: order.outlet.name,
      merchantId: order.merchant?.id || 0,
    },
    orderItems: order.orderItems.map((item: any) => ({
      id: item.id,
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      deposit: item.deposit,
      rentalDays: item.rentalDays,
      notes: item.notes,
      product: {
        id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        images: item.product.images,
        barcode: item.product.barcode,
        rentPrice: item.product.rentPrice,
        deposit: item.product.deposit,
      }
    })),
    payments: order.payments.map((payment: any) => ({
      id: payment.id,
      orderId: order.id,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      createdAt: payment.createdAt,
    })),
    createdBy: order.createdBy ? {
      id: order.createdBy.id,
      name: `${order.createdBy.firstName} ${order.createdBy.lastName}`,
      email: order.createdBy.email,
      role: 'OUTLET_STAFF', // Default role, should be fetched from user data
    } : undefined,
    merchant: {
      id: order.merchant?.id || 0,
      name: order.merchant?.name || '',
      email: order.merchant?.email || '',
    },
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/**
 * Get order statistics - follows single ID system
 */
export async function getOrderStats(userScope: { merchantId?: number; outletId?: number }): Promise<any> {
  const where: any = {};

  // Apply user scope
  if (userScope.merchantId) {
    where.outlet = { merchantId: userScope.merchantId };
  }
  
  if (userScope.outletId) {
    where.outletId = userScope.outletId;
  }

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
      where: { ...where, status: { in: ['COMPLETED', 'PICKUPED'] } },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { ...where, status: { in: ['COMPLETED', 'PICKUPED'] } },
      _sum: { depositAmount: true },
    }),
    prisma.order.count({
      where: { ...where, status: 'PICKUPED' },
    }),
    prisma.order.count({
      where: {
        ...where,
        status: 'PICKUPED',
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

  const averageOrderValue = totalOrders > 0 
    ? (totalRevenue._sum.totalAmount || 0) / totalOrders 
    : 0;

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

/**
 * Get overdue rentals - follows single ID system
 * Returns orders that are past their return date
 */
export async function getOverdueRentals(outletId?: number): Promise<any[]> {
  const where: any = {
    orderType: 'RENT',
    status: { in: ['RESERVED', 'PICKUPED'] },
    returnPlanAt: { lt: new Date() }
  };

  if (outletId) {
    where.outletId = outletId;
  }

  const overdueOrders = await prisma.order.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        }
      },
      outlet: {
        select: {
          id: true,
          name: true,
        }
      },
      orderItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      },
    },
    orderBy: { returnPlanAt: 'asc' },
  });

  return overdueOrders.map((order: any) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    pickupPlanAt: order.pickupPlanAt,
    returnPlanAt: order.returnPlanAt,
    pickedUpAt: order.pickedUpAt,
    returnedAt: order.returnedAt,
    isReadyToDeliver: order.status === 'PICKUPED' && order.returnPlanAt && new Date(order.returnPlanAt) <= new Date(),
    customer: order.customer ? {
      id: order.customer.id,
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      phone: order.customer.phone,
    } : null,
    outlet: {
      id: order.outlet.id,
      name: order.outlet.name,
    },
    orderItems: order.orderItems.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      product: {
        id: item.product.id,
        name: item.product.name,
      }
    })),
  }));
}
