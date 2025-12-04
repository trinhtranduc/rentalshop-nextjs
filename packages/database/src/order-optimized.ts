// ============================================================================
// OPTIMIZED ORDER SEARCH FUNCTIONS
// ============================================================================
// This file contains optimized order search functionality for better performance
// with large datasets (100k+ orders)

import { prisma } from './client';
import type { 
  OrderSearchFilter,
  OrderSearchResult,
  OrderSearchResponse
} from '@rentalshop/types';
import { removeVietnameseDiacritics } from '@rentalshop/utils';

/**
 * Performance monitoring utility
 */
class PerformanceMonitor {
  static async measureQuery<T>(
    name: string, 
    query: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    const result = await query();
    const duration = Date.now() - start;
    
    console.log(`[PERF] ${name}: ${duration}ms`);
    
    // Log slow queries
    if (duration > 1000) {
      console.warn(`[SLOW QUERY] ${name}: ${duration}ms`);
    }
    
    return result;
  }
}

/**
 * Build optimized where clause with proper indexing
 */
function buildOptimizedWhereClause(filters: OrderSearchFilter): any {
  const where: any = {};

  // Text search - optimized for indexed fields (diacritics-insensitive for customer names)
  if (filters.q) {
    const searchTerm = filters.q.trim();
    const normalizedTerm = removeVietnameseDiacritics(searchTerm);
    
    const searchConditions: any[] = [
      { orderNumber: { contains: searchTerm } }, // Uses index
      { customer: { firstName: { contains: searchTerm, mode: 'insensitive' } } },
      { customer: { lastName: { contains: searchTerm, mode: 'insensitive' } } },
      { customer: { phone: { contains: searchTerm } } },
    ];
    
    // Add normalized search for customer names if different from original
    if (normalizedTerm !== searchTerm) {
      searchConditions.push(
        { customer: { firstName: { contains: normalizedTerm, mode: 'insensitive' } } },
        { customer: { lastName: { contains: normalizedTerm, mode: 'insensitive' } } }
      );
    }
    
    where.OR = searchConditions;
  }

  // Use indexed fields for filtering
  if (filters.outletId) {
    where.outletId = filters.outletId; // Uses @@index([outletId, createdAt])
  }

  if (filters.customerId) {
    where.customerId = filters.customerId; // Uses @@index([customerId, createdAt])
  }

  if (filters.userId) {
    where.createdById = filters.userId; // Uses @@index([createdById, createdAt])
  }

  if (filters.orderType) {
    where.orderType = filters.orderType; // Uses @@index([orderType, status])
  }

  if (filters.status) {
    where.status = filters.status; // Uses @@index([status, outletId])
  }

  // Date filters - optimized with createdAt index
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate);
    }
  }

  // Pickup date filter
  if (filters.pickupDate) {
    where.pickupPlanAt = {
      gte: new Date(filters.pickupDate),
      lt: new Date(new Date(filters.pickupDate).getTime() + 24 * 60 * 60 * 1000)
    };
  }

  // Return date filter
  if (filters.returnDate) {
    where.returnPlanAt = {
      gte: new Date(filters.returnDate), 
      lt: new Date(new Date(filters.returnDate).getTime() + 24 * 60 * 60 * 1000)
    };
  }

  return where;
}

/**
 * Optimized order search with minimal data loading
 * Uses select instead of include for better performance
 */
export async function searchOrdersOptimized(filters: OrderSearchFilter): Promise<OrderSearchResponse> {
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

  const where = buildOptimizedWhereClause(filters);

  return await PerformanceMonitor.measureQuery('searchOrdersOptimized', async () => {
    const [orders, total] = await Promise.all([
      // Optimized query with minimal data selection
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
          // Minimal customer data
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            }
          },
          // Minimal outlet data
          outlet: {
            select: {
              id: true,
              name: true,
            }
          },
          // Minimal createdBy data
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            }
          },
          // Count only - don't load actual order items
          _count: {
            select: {
              orderItems: true,
              payments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }, // Uses @@index([createdAt])
        take: limit,
        skip: offset
      }),
      prisma.order.count({ where })
    ]);

    const totalPages = Math.ceil(total / limit);
    const page = Math.floor(offset / limit) + 1;

    const transformedOrders: OrderSearchResult[] = orders.map(order => ({
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
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      isReadyToDeliver: false, // Default value
      customer: order.customer ? {
        id: order.customer.id,
        firstName: order.customer.firstName,
        lastName: order.customer.lastName,
        phone: order.customer.phone,
        email: order.customer.email,
      } : null,
      outlet: {
        id: order.outlet.id,
        name: order.outlet.name,
      },
      orderItems: [], // Empty array for optimized version
    }));

    return {
      success: true,
      data: transformedOrders,
      total,
      page,
      limit,
      totalPages,
      hasMore: offset + limit < total
    };
  });
}

/**
 * Cursor-based pagination for better performance with large datasets
 * More efficient than offset-based pagination
 */
export async function searchOrdersWithCursor(filters: OrderSearchFilter & { cursor?: string }): Promise<{
  data: OrderSearchResult[];
  hasMore: boolean;
  nextCursor: string | null;
  total?: number;
}> {
  const {
    cursor,
    limit = 20,
    ...otherFilters
  } = filters;

  const where = buildOptimizedWhereClause(otherFilters);
  
  // Add cursor condition for pagination
  if (cursor) {
    where.createdAt = {
      ...where.createdAt,
      lt: new Date(cursor)
    };
  }

  return await PerformanceMonitor.measureQuery('searchOrdersWithCursor', async () => {
    const orders = await prisma.order.findMany({
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
            phone: true,
            email: true,
          }
        },
        outlet: {
          select: {
            id: true,
            name: true,
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        _count: {
          select: {
            orderItems: true,
            payments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1 // Take one extra to check if there are more
    });

    const hasMore = orders.length > limit;
    if (hasMore) {
      orders.pop(); // Remove the extra record
    }

    const transformedOrders: OrderSearchResult[] = orders.map(order => ({
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
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      isReadyToDeliver: false, // Default value
      customer: order.customer ? {
        id: order.customer.id,
        firstName: order.customer.firstName,
        lastName: order.customer.lastName,
        phone: order.customer.phone,
        email: order.customer.email,
      } : null,
      outlet: {
        id: order.outlet.id,
        name: order.outlet.name,
      },
      orderItems: [], // Empty array for optimized version
    }));

    return {
      data: transformedOrders,
      hasMore,
      nextCursor: hasMore ? orders[orders.length - 1].createdAt.toISOString() : null
    };
  });
}

/**
 * Get order details with optimized loading
 * Only loads related data when needed
 */
export async function getOrderDetailsOptimized(orderId: number, includeItems = false, includePayments = false) {
  return await PerformanceMonitor.measureQuery('getOrderDetailsOptimized', async () => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        securityDeposit: true,
        damageFee: true,
        lateFee: true,
        discountType: true,
        discountValue: true,
        discountAmount: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        pickedUpAt: true,
        returnedAt: true,
        rentalDuration: true,
        isReadyToDeliver: true,
        collateralType: true,
        collateralDetails: true,
        notes: true,
        pickupNotes: true,
        returnNotes: true,
        damageNotes: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
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
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        // Conditionally include order items
        ...(includeItems && {
          orderItems: {
            select: {
              id: true,
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
                  barcode: true,
                  rentPrice: true,
                  deposit: true,
                  images: true,
                }
              }
            }
          }
        }),
        // Conditionally include payments
        ...(includePayments && {
          payments: {
            select: {
              id: true,
              amount: true,
              currency: true,
              method: true,
              type: true,
              status: true,
              reference: true,
              transactionId: true,
              invoiceNumber: true,
              description: true,
              notes: true,
              processedAt: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
          }
        }),
        // Always include counts
        _count: {
          select: {
            orderItems: true,
            payments: true
          }
        }
      }
    });

    return order;
  });
}

/**
 * Get order summary for dashboard/listing views
 * Minimal data for fast loading
 */
export async function getOrderSummary(orderId: number) {
  return await PerformanceMonitor.measureQuery('getOrderSummary', async () => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        orderType: true,
        status: true,
        totalAmount: true,
        depositAmount: true,
        pickupPlanAt: true,
        returnPlanAt: true,
        createdAt: true,
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
        _count: {
          select: {
            orderItems: true,
            payments: true
          }
        }
      }
    });

    return order;
  });
}
