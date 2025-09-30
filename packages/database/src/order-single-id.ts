// ============================================================================
// ORDER SEARCH FUNCTIONS
// ============================================================================
// This file contains the searchOrders function for order search functionality

import { prisma } from './client';
import type { 
  OrderSearchFilter,
  OrderSearchResult,
  OrderSearchResponse
} from '@rentalshop/types';

/**
 * Search orders with filters
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
    limit = 20,
    offset = 0
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
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      where.createdAt.lte = new Date(endDate);
    }
  }

  // Pickup date filter
  if (pickupDate) {
    where.pickupPlanAt = {
      gte: new Date(pickupDate),
      lt: new Date(new Date(pickupDate).getTime() + 24 * 60 * 60 * 1000)
    };
  }

  // Return date filter
  if (returnDate) {
    where.returnPlanAt = {
      gte: new Date(returnDate), 
      lt: new Date(new Date(returnDate).getTime() + 24 * 60 * 60 * 1000)
    };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
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
            phone: true,
            email: true,
          }
        },
        outlet: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    }),
    prisma.order.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);
  const page = Math.floor(offset / limit) + 1;

  const transformedOrders: OrderSearchResult[] = orders.map(order => ({
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType as any, // Cast to satisfy type
    status: order.status as any, // Cast to satisfy type  
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount,
    pickupPlanAt: order.pickupPlanAt,
    returnPlanAt: order.returnPlanAt,
    pickedUpAt: order.pickedUpAt,
    returnedAt: order.returnedAt,
    isReadyToDeliver: false, // Default value since not in query
    customer: order.customer ? {
      id: order.customer.id,
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      email: order.customer.email,
      phone: order.customer.phone || '',
    } : null,
    outlet: {
      id: order.outlet?.id || 0,
      name: order.outlet?.name || '',
    },
    orderItems: [], // Empty array since not queried for performance
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  }));

  return {
    success: true,
    data: {
      orders: transformedOrders,
      total,
      page,
      limit,
      offset,
      hasMore: page < totalPages,
      totalPages
    }
  };
}