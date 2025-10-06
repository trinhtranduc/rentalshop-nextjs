import { prisma } from './client';
import type { Prisma } from '@prisma/client';
import type { 
  OrderSearchFilter,
  OrderSearchResult,
  OrderSearchResponse
} from '@rentalshop/types';

export interface OrderWithRelations {
  id: number
  orderNumber: string
  orderType: string
  status: string
  totalAmount: number
  depositAmount: number
  securityDeposit: number
  damageFee: number
  lateFee: number
  discountType?: string
  discountValue: number
  discountAmount: number
  pickupPlanAt?: Date
  returnPlanAt?: Date
  pickedUpAt?: Date
  returnedAt?: Date
  rentalDuration?: number
  isReadyToDeliver: boolean
  collateralType?: string
  collateralDetails?: string
  notes?: string
  pickupNotes?: string
  returnNotes?: string
  damageNotes?: string
  createdAt: Date
  updatedAt: Date
  outletId: number
  merchantId?: number // Extracted from outlet relation for authorization
  customerId?: number
  createdById: number
  // Relations
  customer?: {
    id: number
    firstName: string
    lastName: string
    phone?: string
    email?: string
    address?: string
    idNumber?: string
  }
  outlet?: {
    id: number
    name: string
    address: string
    merchantId: number
    merchant: {
      id: number
      name: string
    }
  }
  createdBy?: {
    id: number
    firstName?: string
    email: string
  }
  orderItems?: Array<{
    id: number
    quantity: number
    unitPrice: number
    totalPrice: number
    productId: number
    product?: {
      id: number
      name: string
    }
  }>
  payments?: Array<{
    id: number
    amount: number
    method: string
    status: string
    processedAt?: Date
  }>
}

const orderSelect = {
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
  outletId: true,
  customerId: true,
  createdById: true,
} satisfies Prisma.OrderSelect

const orderInclude = {
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      address: true,
      idNumber: true,
    }
  },
  outlet: {
    select: {
      id: true,
      name: true,
      address: true,
      merchantId: true, // Include merchantId for authorization checks
      merchant: {
        select: {
          id: true,
          name: true,
        }
      }
    }
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      email: true,
    }
  },
  orderItems: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      productId: true,
      product: {
        select: {
          id: true,
          name: true,
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
      processedAt: true,
    }
  }
} satisfies Prisma.OrderInclude

function transformOrder(order: any): OrderWithRelations {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount ?? 0,
    securityDeposit: order.securityDeposit ?? 0,
    damageFee: order.damageFee ?? 0,
    lateFee: order.lateFee ?? 0,
    discountType: order.discountType || undefined,
    discountValue: order.discountValue ?? 0,
    discountAmount: order.discountAmount ?? 0,
    pickupPlanAt: order.pickupPlanAt || undefined,
    returnPlanAt: order.returnPlanAt || undefined,
    pickedUpAt: order.pickedUpAt || undefined,
    returnedAt: order.returnedAt || undefined,
    rentalDuration: order.rentalDuration || undefined,
    isReadyToDeliver: order.isReadyToDeliver ?? false,
    collateralType: order.collateralType || undefined,
    collateralDetails: order.collateralDetails || undefined,
    notes: order.notes || undefined,
    pickupNotes: order.pickupNotes || undefined,
    returnNotes: order.returnNotes || undefined,
    damageNotes: order.damageNotes || undefined,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    outletId: order.outletId,
    merchantId: order.outlet?.merchantId, // Extract merchantId from outlet relation for authorization
    customerId: order.customerId || undefined,
    createdById: order.createdById,
    // Relations
    customer: order.customer,
    outlet: order.outlet,
    createdBy: order.createdBy,
    orderItems: order.orderItems,
    payments: order.payments,
  }
}

export async function getOrderById(id: number): Promise<OrderWithRelations | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  })

  if (!order) return null
  return transformOrder(order)
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderWithRelations | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: orderInclude,
  })

  if (!order) return null
  return transformOrder(order)
}

export async function getOrdersByOutlet(outletId: number, limit = 50, offset = 0) {
  const orders = await prisma.order.findMany({
    where: { outletId },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return orders.map(transformOrder)
}

export async function getOrdersByCustomer(customerId: number, limit = 50, offset = 0) {
  const orders = await prisma.order.findMany({
    where: { customerId },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return orders.map(transformOrder)
}

export async function createOrder(data: {
  orderNumber: string
  orderType: string
  status?: string
  totalAmount: number
  depositAmount?: number
  securityDeposit?: number
  damageFee?: number
  lateFee?: number
  discountType?: string
  discountValue?: number
  discountAmount?: number
  pickupPlanAt?: Date
  returnPlanAt?: Date
  rentalDuration?: number
  isReadyToDeliver?: boolean
  collateralType?: string
  collateralDetails?: string
  notes?: string
  pickupNotes?: string
  outletId: number
  customerId?: number
  createdById: number
}): Promise<OrderWithRelations> {
  const order = await prisma.order.create({
    data: {
      orderNumber: data.orderNumber,
      orderType: data.orderType,
      status: data.status ?? 'RESERVED',
      totalAmount: data.totalAmount,
      depositAmount: data.depositAmount ?? 0,
      securityDeposit: data.securityDeposit ?? 0,
      damageFee: data.damageFee ?? 0,
      lateFee: data.lateFee ?? 0,
      discountType: data.discountType,
      discountValue: data.discountValue ?? 0,
      discountAmount: data.discountAmount ?? 0,
      pickupPlanAt: data.pickupPlanAt,
      returnPlanAt: data.returnPlanAt,
      rentalDuration: data.rentalDuration,
      isReadyToDeliver: data.isReadyToDeliver ?? false,
      collateralType: data.collateralType,
      collateralDetails: data.collateralDetails,
      notes: data.notes,
      pickupNotes: data.pickupNotes,
      outletId: data.outletId,
      customerId: data.customerId,
      createdById: data.createdById,
    },
    include: orderInclude,
  })

  return transformOrder(order)
}

export async function updateOrder(
  id: number,
  data: Partial<{
    orderType: string
    status: string
    totalAmount: number
    depositAmount: number
    securityDeposit: number
    damageFee: number
    lateFee: number
    discountType: string
    discountValue: number
    discountAmount: number
    pickupPlanAt: Date
    returnPlanAt: Date
    pickedUpAt: Date
    returnedAt: Date
    rentalDuration: number
    isReadyToDeliver: boolean
    collateralType: string
    collateralDetails: string
    notes: string
    pickupNotes: string
    returnNotes: string
    damageNotes: string
    customerId: number
    orderItems?: Array<{
      productId: number
      quantity: number
      unitPrice: number
      totalPrice: number
      deposit?: number
      notes?: string
      rentalDays?: number
    }>
  }>
): Promise<OrderWithRelations> {
  console.log('🔧 updateOrder called with id:', id);
  console.log('🔧 updateOrder data keys:', Object.keys(data));
  console.log('🔧 updateOrder has orderItems?:', !!data.orderItems, 'length:', data.orderItems?.length);
  
  // Extract orderItems from data if present
  const { orderItems, ...orderData } = data
  
  // Build update data
  const updateData: any = { ...orderData }
  
  // Handle order items separately if provided
  if (orderItems && orderItems.length > 0) {
    console.log('🔧 Processing', orderItems.length, 'order items');
    updateData.orderItems = {
      // Delete all existing order items
      deleteMany: {},
      // Create new order items
      create: orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice || (item.quantity * item.unitPrice),
        deposit: item.deposit || 0,
        notes: item.notes,
        rentalDays: item.rentalDays
      }))
    }
    console.log('🔧 Converted orderItems to nested write format');
  }
  
  console.log('🔧 Final update data structure:', JSON.stringify({
    hasOrderItems: !!updateData.orderItems,
    orderItemsType: updateData.orderItems ? typeof updateData.orderItems : 'none',
    orderItemsIsArray: Array.isArray(updateData.orderItems),
    orderItemsKeys: updateData.orderItems ? Object.keys(updateData.orderItems) : []
  }));
  
  const order = await prisma.order.update({
    where: { id },
    data: updateData,
    include: orderInclude,
  })

  console.log('✅ Order updated successfully');
  return transformOrder(order)
}

export async function deleteOrder(id: number): Promise<boolean> {
  try {
    await prisma.order.delete({
      where: { id },
    })
    return true
  } catch {
    return false
  }
}

export async function getOrderCount(outletId?: number, status?: string): Promise<number> {
  const where: Prisma.OrderWhereInput = {}
  if (outletId) where.outletId = outletId
  if (status) where.status = status

  return prisma.order.count({ where })
}

export async function generateOrderNumber(outletId: number): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  
  const prefix = `ORD-${year}${month}${day}`
  
  const latestOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
      outletId,
    },
    orderBy: {
      orderNumber: 'desc',
    },
    select: {
      orderNumber: true,
    },
  })

  let sequence = 1
  if (latestOrder?.orderNumber) {
    const lastSequence = parseInt(latestOrder.orderNumber.split('-').pop() || '0')
    sequence = lastSequence + 1
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`
}

// ============================================================================
// SIMPLIFIED API FUNCTIONS (for db object)
// ============================================================================

// ============================================================================
// LEGACY ORDER SEARCH (for backward compatibility)
// ============================================================================

/**
 * Search orders with filters (legacy function)
 * @deprecated Use simplifiedOrders.search instead
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
    orderType: order.orderType as any,
    status: order.status as any,
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount,
    pickupPlanAt: order.pickupPlanAt,
    returnPlanAt: order.returnPlanAt,
    pickedUpAt: order.pickedUpAt,
    returnedAt: order.returnedAt,
    isReadyToDeliver: false,
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
    orderItems: [],
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
      hasMore: offset + limit < total,
      totalPages
    }
  };
}

export const simplifiedOrders = {
  /**
   * Find order by ID (simplified API)
   */
  findById: async (id: number) => {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        outlet: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        orderItems: {
          include: {
            product: { select: { id: true, name: true, barcode: true } }
          }
        },
        payments: true
      }
    });
  },

  /**
   * Find order by order number (simplified API)
   */
  findByNumber: async (orderNumber: string) => {
    return await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        outlet: { 
          select: { 
            id: true, 
            name: true,
            merchantId: true,
            merchant: { select: { id: true, name: true } }
          } 
        },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        orderItems: {
          include: {
            product: { select: { id: true, name: true, barcode: true } }
          }
        },
        payments: true
      }
    });
  },

  /**
   * Create new order (simplified API)
   */
  create: async (data: any) => {
    return await prisma.order.create({
      data,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        outlet: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        orderItems: {
          include: {
            product: { select: { id: true, name: true, barcode: true } }
          }
        },
        payments: true
      }
    });
  },

  /**
   * Update order (simplified API)
   */
  update: async (id: number, data: any) => {
    return await prisma.order.update({
      where: { id },
      data,
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        outlet: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        orderItems: {
          include: {
            product: { select: { id: true, name: true, barcode: true } }
          }
        },
        payments: true
      }
    });
  },

  /**
   * Delete order (simplified API)
   */
  delete: async (id: number) => {
    return await prisma.order.delete({
      where: { id }
    });
  },

  /**
   * Search orders with simple filters (simplified API)
   */
  search: async (filters: any) => {
    const { page = 1, limit = 20, where: whereClause, ...whereFilters } = filters;
    const skip = (page - 1) * limit;

    // Build where clause - start with provided where clause if any
    const where: any = whereClause || {};
    
    // Handle merchant-level filtering (orders belong to outlets, outlets belong to merchants)
    if (whereFilters.merchantId) {
      where.outlet = {
        merchantId: whereFilters.merchantId
      };
    }
    
    // Handle outlet-level filtering (overrides merchant filter if both are present)                                                                            
    if (whereFilters.outletId) {
      // Support both simple values and complex objects like { in: [...] }
      where.outletId = whereFilters.outletId;
    }
    
    if (whereFilters.customerId) where.customerId = whereFilters.customerId;
    if (whereFilters.status) where.status = whereFilters.status;
    if (whereFilters.orderType) where.orderType = whereFilters.orderType;
    
    // Filter by product (through order items)
    if (whereFilters.productId) {
      where.orderItems = {
        some: {
          productId: whereFilters.productId
        }
      };
    }
    
    // Date range
    if (whereFilters.startDate || whereFilters.endDate) {
      where.createdAt = {};
      if (whereFilters.startDate) where.createdAt.gte = whereFilters.startDate;
      if (whereFilters.endDate) where.createdAt.lte = whereFilters.endDate;
    }

    // Text search
    if (whereFilters.search) {
      where.OR = [
        { orderNumber: { contains: whereFilters.search } },
        { customer: { firstName: { contains: whereFilters.search } } },
        { customer: { lastName: { contains: whereFilters.search } } },
        { customer: { phone: { contains: whereFilters.search } } }
      ];
    }

    const [orders, total] = await Promise.all([
      // OPTIMIZED: Use select instead of include for better performance
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
              phone: true, 
              email: true 
            } 
          },
          outlet: { 
            select: { 
              id: true, 
              name: true,
              merchant: { select: { id: true, name: true } }
            } 
          },
          createdBy: { 
            select: { 
              id: true, 
              firstName: true, 
              lastName: true 
            } 
          },
          // OPTIMIZED: Count instead of loading all items
          _count: {
            select: {
              orderItems: true,
              payments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }, // Uses @@index([createdAt])
        skip,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    return {
      data: orders,
      total,
      page,
      limit,
      hasMore: skip + limit < total
    };
  },

  /**
   * Get order statistics (simplified API)
   */
  getStats: async (whereClause?: any) => {
    // Handle both direct where clause and object with where property
    const where = whereClause?.where || whereClause || {};
    return await prisma.order.count({ where });
  },

  /**
   * Group orders by field (simplified API)
   */
  groupBy: async (args: any) => {
    return await prisma.order.groupBy(args);
  },

  /**
   * Aggregate orders (simplified API)
   */
  aggregate: async (args: any) => {
    return await prisma.order.aggregate(args);
  }
};