// ============================================================================
// SINGLE ID ORDER FUNCTIONS
// ============================================================================
// This file contains order functions that use single ID system:
// - Input: id (number)
// - Database: queries by id (integer), uses integer IDs for relationships
// - Return: includes id (number)

import { prisma } from './client';
import type { 
  OrderSearchFilter,
  OrderSearchResult,
  OrderSearchResponse
} from '@rentalshop/types';

// ============================================================================
// ORDER SEARCH FUNCTIONS
// ============================================================================
      
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
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      email: order.customer.email,
      phone: order.customer.phone,
    } : undefined,
    outlet: {
      id: order.outlet.id,
      name: order.outlet.name,
    },
    orderItems: order.orderItems.map(item => ({
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
    payments: order.payments.map(payment => ({
      id: payment.id,
      orderId: order.id,
      amount: payment.amount,
      method: payment.method,
      status: payment.status,
      createdAt: payment.createdAt,
    })),
    createdBy: order.createdBy ? {
      id: order.createdBy.id,
      firstName: order.createdBy.firstName,
      lastName: order.createdBy.lastName,
      email: order.createdBy.email,
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
    page = 1,
    limit = 20
  } = filters;

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

  const results: OrderSearchResult[] = orders.map(order => ({
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
    orderItems: order.orderItems.map(item => ({
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
