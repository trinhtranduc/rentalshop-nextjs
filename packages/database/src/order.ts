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
    outletId: number
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
  
  // Extract relationship IDs and orderItems from data
  const { 
    orderItems, 
    customerId, 
    outletId,
    ...allFields 
  } = data;
  
  // WHITELIST: Only valid Order model fields from schema
  const validFields: (keyof typeof allFields)[] = [
    'orderType', 'status', 'totalAmount', 'depositAmount', 
    'securityDeposit', 'damageFee', 'lateFee', 'discountType', 
    'discountValue', 'discountAmount', 'pickupPlanAt', 'returnPlanAt',
    'pickedUpAt', 'returnedAt', 'rentalDuration', 'isReadyToDeliver',
    'collateralType', 'collateralDetails', 'notes', 'pickupNotes',
    'returnNotes', 'damageNotes'
  ];
  
  // Build update data - filter to only valid fields
  const updateData: any = {};
  validFields.forEach(field => {
    if (field in allFields && allFields[field as keyof typeof allFields] !== undefined) {
      updateData[field] = allFields[field as keyof typeof allFields];
    }
  });
  
  console.log('🔧 Filtered update fields:', Object.keys(updateData));
  
  // Handle customer relationship if provided
  if (customerId !== undefined) {
    if (customerId === null) {
      updateData.customer = { disconnect: true };
    } else {
      updateData.customer = { connect: { id: customerId } };
    }
  }
  
  // Handle outlet relationship if provided (should not change usually)
  if (outletId !== undefined) {
    updateData.outlet = { connect: { id: outletId } };
  }
  
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
  
  console.log('🔧 Final update data structure:', {
    hasOrderItems: !!updateData.orderItems,
    hasCustomer: !!updateData.customer,
    hasOutlet: !!updateData.outlet
  });
  
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
  
  const prefix = `${year}${month}${day}`
  
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
   * Find order by ID (simplified API) - OPTIMIZED for performance
   */
  findById: async (id: number) => {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        outlet: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        orderItems: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            deposit: true,
            productId: true,
            notes: true,
            rentalDays: true,
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
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            deposit: true,
            productId: true,
            notes: true,
            rentalDays: true,
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
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            deposit: true,
            productId: true,
            notes: true,
            rentalDays: true,
            product: { select: { id: true, name: true, barcode: true } }
          }
        },
        payments: true
      }
    });
  },

  /**
   * Update order (simplified API) - Now uses proper updateOrder function
   */
  update: async (id: number, data: any) => {
    return await updateOrder(id, data);
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
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      where: whereClause, 
      ...whereFilters 
    } = filters;
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

    // ✅ Build dynamic orderBy clause
    const orderBy: any = {};
    if (sortBy === 'orderNumber') {
      orderBy.orderNumber = sortOrder;
    } else if (sortBy === 'totalAmount') {
      orderBy.totalAmount = sortOrder;
    } else if (sortBy === 'customer') {
      orderBy.customer = { firstName: sortOrder };
    } else {
      // Default: createdAt
      orderBy.createdAt = sortOrder;
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
        orderBy, // ✅ Dynamic sorting
        skip,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    console.log(`📊 db.orders.search: page=${page}, skip=${skip}, limit=${limit}, total=${total}, orders=${orders.length}`);

    return {
      data: orders,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * Find first order matching criteria (simplified API)
   */
  findFirst: async (whereClause: any) => {
    // Handle both direct where clause and object with where property
    const where = whereClause?.where || whereClause || {};
    return await prisma.order.findFirst({
      where,
      include: {
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
            name: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true
              }
            }
          }
        }
      }
    });
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
  },

  // ============================================================================
  // PERFORMANCE OPTIMIZED METHODS FOR LARGE DATASETS
  // ============================================================================

  /**
   * Get orders list with minimal data for performance (for large datasets)
   * Only essential fields for list view - no nested objects
   */
  /**
   * Search orders with orderItems included (for calendar API)
   */
  searchWithItems: async (filters: {
    merchantId?: number;
    outletId?: number;
    status?: string;
    orderType?: string;
    productId?: number;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    where?: any;
  } = {}) => {
    const {
      merchantId,
      outletId,
      status,
      orderType,
      productId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 1000,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      where: whereClause
    } = filters;

    // Build where clause
    const where: any = whereClause || {};
    
    console.log('🔍 searchWithItems - Original whereClause:', JSON.stringify(whereClause, null, 2));

    // Handle merchant-level filtering from whereClause first
    if (where.merchantId) {
      console.log('🔍 Found merchantId in whereClause, converting to outlet.merchantId');
      where.outlet = {
        merchantId: where.merchantId
      };
      delete where.merchantId; // Remove direct merchantId
      console.log('🔍 After conversion:', JSON.stringify(where, null, 2));
    }

    // Handle merchant-level filtering from parameters
    if (merchantId) {
      where.outlet = {
        merchantId: merchantId
      };
    }

    // Handle outlet-level filtering (overrides merchant filter if both are present)
    if (outletId) {
      where.outletId = outletId;
      // Remove outlet filter if outletId is specified
      delete where.outlet;
    }

    if (status) where.status = status;
    if (orderType) where.orderType = orderType;

    // Filter by product (through order items)
    if (productId) {
      where.orderItems = {
        some: {
          productId: productId
        }
      };
    }

    // Date range
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Text search
    if (search) {
      where.OR = [
        { orderNumber: { contains: search } },
        { customer: { firstName: { contains: search } } },
        { customer: { lastName: { contains: search } } },
        { customer: { phone: { contains: search } } }
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
              phone: true,
              email: true,
            }
          },
          outlet: {
            select: {
              id: true,
              name: true,
              merchantId: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                  images: true,
                  rentPrice: true,
                  deposit: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    return {
      data: orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  },

  findManyMinimal: async (filters: {
    merchantId?: number;
    outletId?: number;
    status?: string;
    orderType?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}) => {
    const {
      merchantId,
      outletId,
      status,
      orderType,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    // Build where clause
    const where: any = {};
    if (merchantId) where.merchantId = merchantId;
    if (outletId) where.outletId = outletId;
    if (status) where.status = status;
    if (orderType) where.orderType = orderType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } }
      ];
    }

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
          notes: true,
          createdAt: true,
          updatedAt: true,
          outletId: true,
          customerId: true,
          createdById: true,
          // Minimal customer data
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          // Minimal outlet data
          outlet: {
            select: {
              id: true,
              name: true,
              address: true,
              merchant: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          // Minimal createdBy data
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    // Get item counts for each order
    const orderIds = orders.map(order => order.id);
    const itemCounts = await prisma.orderItem.groupBy({
      by: ['orderId'],
      where: { orderId: { in: orderIds } },
      _count: { id: true }
    });
    const itemCountMap = new Map(itemCounts.map(item => [item.orderId, item._count.id]));

    // Get payment counts and totals
    const paymentCounts = await prisma.payment.groupBy({
      by: ['orderId'],
      where: { orderId: { in: orderIds } },
      _count: { id: true },
      _sum: { amount: true }
    });
    const paymentCountMap = new Map(paymentCounts.map(payment => [payment.orderId, payment._count.id]));
    const totalPaidMap = new Map(paymentCounts.map(payment => [payment.orderId, payment._sum.amount || 0]));

    // Enhance orders with calculated fields and flattened structure
    const enhancedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      notes: order.notes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      
      // Flatten customer data
      customerId: order.customerId,
      customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : null,
      customerPhone: order.customer?.phone || null,
      customerEmail: order.customer?.email || null,
      
      // Flatten outlet data
      outletId: order.outletId,
      outletName: order.outlet?.name || null,
      outletAddress: order.outlet?.address || null,
      merchantId: order.outlet?.merchant?.id || null,
      merchantName: order.outlet?.merchant?.name || null,
      
      // Flatten createdBy data
      createdById: order.createdById,
      createdByName: order.createdBy ? `${order.createdBy.firstName} ${order.createdBy.lastName}` : null,
      createdByEmail: order.createdBy?.email || null,
      
      // Calculated fields
      itemCount: itemCountMap.get(order.id) || 0,
      paymentCount: paymentCountMap.get(order.id) || 0,
      totalPaid: totalPaidMap.get(order.id) || 0
    }));

    return {
      data: enhancedOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  /**
   * Get orders list with complete order information for performance (for large datasets)
   * Includes all order fields, customer, outlet, createdBy, and products
   */
  findManyLightweight: async (filters: {
    merchantId?: number;
    outletId?: number;
    status?: string;
    orderType?: string;
    productId?: number;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const {
      merchantId,
      outletId,
      status,
      orderType,
      productId,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const where: any = {};
    
    if (merchantId) {
      where.outlet = { merchantId };
    }
    if (outletId) {
      where.outletId = outletId;
    }
    if (status) {
      where.status = status;
    }
    if (orderType) {
      where.orderType = orderType;
    }
    
    // Filter by product (through order items)
    if (productId) {
      where.orderItems = {
        some: {
          productId: productId
        }
      };
    }
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

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
          // Customer data
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
              country: true
            }
          },
          // Outlet data
          outlet: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              city: true,
              state: true,
              zipCode: true,
              country: true,
              merchant: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          // CreatedBy data
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          // Include products for list view
          orderItems: {
            select: {
              id: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              notes: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                  images: true,
                  rentPrice: true,
                  deposit: true
                }
              }
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.order.count({ where })
    ]);

    // Get summary counts for order items and payments (separate queries for performance)
    const orderIds = orders.map(o => o.id);
    const [itemCounts, paymentCounts] = await Promise.all([
      prisma.orderItem.groupBy({
        by: ['orderId'],
        where: { orderId: { in: orderIds } },
        _count: { id: true }
      }),
      prisma.payment.groupBy({
        by: ['orderId'],
        where: { 
          orderId: { in: orderIds },
          status: 'COMPLETED'
        },
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);

    // Create lookup maps for performance
    const itemCountMap = new Map(itemCounts.map(item => [item.orderId, item._count.id]));
    const paymentCountMap = new Map(paymentCounts.map(payment => [payment.orderId, payment._count.id]));
    const totalPaidMap = new Map(paymentCounts.map(payment => [payment.orderId, payment._sum.amount || 0]));

    // Enhance orders with calculated fields and flattened structure
    const enhancedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      status: order.status,
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      securityDeposit: order.securityDeposit,
      damageFee: order.damageFee,
      lateFee: order.lateFee,
      discountType: order.discountType,
      discountValue: order.discountValue,
      discountAmount: order.discountAmount,
      pickupPlanAt: order.pickupPlanAt,
      returnPlanAt: order.returnPlanAt,
      pickedUpAt: order.pickedUpAt,
      returnedAt: order.returnedAt,
      rentalDuration: order.rentalDuration,
      isReadyToDeliver: order.isReadyToDeliver,
      collateralType: order.collateralType,
      collateralDetails: order.collateralDetails,
      notes: order.notes,
      pickupNotes: order.pickupNotes,
      returnNotes: order.returnNotes,
      damageNotes: order.damageNotes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      
      // Flatten customer data (simplified)
      customerId: order.customerId,
      customerName: order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : null,
      customerPhone: order.customer?.phone || null,
      
      // Flatten outlet data (simplified)
      outletId: order.outletId,
      outletName: order.outlet?.name || null,
      merchantName: order.outlet?.merchant?.name || null,
      
      // Flatten createdBy data
      createdById: order.createdById,
      createdByName: order.createdBy ? `${order.createdBy.firstName} ${order.createdBy.lastName}` : null,
      
      // Order items with flattened product data
      orderItems: order.orderItems?.map(item => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        notes: item.notes,
        // Flatten product data
        productId: item.product?.id,
        productName: item.product?.name,
        productBarcode: item.product?.barcode,
        productImages: item.product?.images ? 
          (Array.isArray(item.product.images) ? item.product.images : 
           typeof item.product.images === 'string' ? 
             item.product.images.split(',').filter(Boolean) : []) : [],
        productRentPrice: item.product?.rentPrice,
        productDeposit: item.product?.deposit
      })) || [],
      
      // Calculated fields
      itemCount: itemCountMap.get(order.id) || 0,
      paymentCount: paymentCountMap.get(order.id) || 0,
      totalPaid: totalPaidMap.get(order.id) || 0
    }));

    return {
      data: enhancedOrders,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * Get order by ID with full detail data
   * Includes all order fields, customer, outlet, products, payments, and timeline
   */
  findByIdDetail: async (id: number) => {
    const order = await prisma.order.findUnique({
      where: { id },
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
        outletId: true,
        customerId: true,
        createdById: true,
        
        // Full customer data
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
            dateOfBirth: true,
            notes: true,
            createdAt: true,
            updatedAt: true
          }
        },
        
        // Full outlet data
        outlet: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            isActive: true,
            merchant: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                city: true,
                state: true,
                zipCode: true,
                country: true,
                businessType: true,
                pricingType: true,
                taxId: true,
                currency: true
              }
            }
          }
        },
        
        // Full createdBy data
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true
          }
        },
        
        // Full order items with products
        orderItems: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            notes: true,
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                images: true,
                rentPrice: true,
                deposit: true,
                description: true,
                isActive: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true
                  }
                }
              }
            }
          }
        },
        
        // Full payments data
        payments: {
          select: {
            id: true,
            amount: true,
            method: true,
            status: true,
            reference: true,
            notes: true,
            processedAt: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!order) return null;

    // Get order timeline/audit log (if exists)
    let timeline: any[] = [];
    try {
      timeline = await (prisma as any).orderAuditLog?.findMany({
        where: { orderId: id },
        select: {
          id: true,
          action: true,
          description: true,
          oldValues: true,
          newValues: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }) || [];
    } catch (error) {
      // OrderAuditLog table might not exist
      console.log('OrderAuditLog table not found, skipping timeline');
    }

    // Calculate additional fields
    const itemCount = (order as any).orderItems?.length || 0;
    const paymentCount = (order as any).payments?.length || 0;
    const totalPaid = (order as any).payments
      ?.filter((p: any) => p.status === 'COMPLETED')
      .reduce((sum: number, p: any) => sum + p.amount, 0) || 0;

    return {
      ...order,
      // Calculated fields
      itemCount,
      paymentCount,
      totalPaid,
      // Timeline
      timeline
    };
  },

  /**
   * Get order detail with optimized loading
   * Loads related data only when needed
   */
  findByIdOptimized: async (id: number, options: {
    includeItems?: boolean;
    includePayments?: boolean;
    includeCustomer?: boolean;
    includeOutlet?: boolean;
  } = {}) => {
    const {
      includeItems = true,
      includePayments = true,
      includeCustomer = true,
      includeOutlet = true
    } = options;

    const select: any = {
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
      createdById: true
    };

    // Conditionally include relations based on options
    if (includeCustomer) {
      select.customer = {
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
          dateOfBirth: true,
          idNumber: true,
          idType: true
        }
      };
    }

    if (includeOutlet) {
      select.outlet = {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          city: true,
          state: true,
          zipCode: true,
          country: true,
          merchant: {
            select: {
              id: true,
              name: true
            }
          }
        }
      };
    }

    select.createdBy = {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    };

    if (includeItems) {
      select.orderItems = {
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          deposit: true,
          productId: true,
          notes: true,
          rentalDays: true,
          product: {
            select: {
              id: true,
              name: true,
              barcode: true,
              description: true,
              images: true,
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      };
    }

    if (includePayments) {
      select.payments = {
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
          failureReason: true,
          processedAt: true,
          processedBy: true,
          createdAt: true
        }
      };
    }

    return await prisma.order.findUnique({
      where: { id },
      select
    });
  },

  /**
   * Search orders with cursor-based pagination for large datasets
   * More efficient than offset-based pagination for large datasets
   * Includes complete order information and products
   */
  searchWithCursor: async (filters: {
    merchantId?: number;
    outletId?: number;
    status?: string;
    orderType?: string;
    startDate?: Date;
    endDate?: Date;
    cursor?: string;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    const {
      merchantId,
      outletId,
      status,
      orderType,
      startDate,
      endDate,
      cursor,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = filters;

    const where: any = {};
    
    if (merchantId) {
      where.outlet = { merchantId };
    }
    if (outletId) {
      where.outletId = outletId;
    }
    if (status) {
      where.status = status;
    }
    if (orderType) {
      where.orderType = orderType;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // Add cursor condition for pagination
    if (cursor) {
      const cursorCondition = sortOrder === 'desc' 
        ? { [sortBy]: { lt: new Date(cursor) } }
        : { [sortBy]: { gt: new Date(cursor) } };
      where.AND = [cursorCondition];
    }

    const orders = await prisma.order.findMany({
      where,
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
        outletId: true,
        customerId: true,
        createdById: true,
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
            country: true
          }
        },
        outlet: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            merchant: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        // Include products for list view
        orderItems: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            notes: true,
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                images: true,
                rentPrice: true,
                deposit: true
              }
            }
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      take: limit + 1 // Take one extra to check if there are more
    });

    const hasMore = orders.length > limit;
    if (hasMore) {
      orders.pop(); // Remove the extra item
    }

    const nextCursor = hasMore && orders.length > 0 
      ? orders[orders.length - 1][sortBy as keyof typeof orders[0]]?.toString()
      : null;

    return {
      data: orders,
      hasMore,
      nextCursor
    };
  },

  /**
   * Get order statistics for dashboard (optimized aggregation)
   */
  getStatistics: async (filters: {
    merchantId?: number;
    outletId?: number;
    startDate?: Date;
    endDate?: Date;
  }) => {
    const { merchantId, outletId, startDate, endDate } = filters;

    const where: any = {};
    
    if (merchantId) {
      where.outlet = { merchantId };
    }
    if (outletId) {
      where.outletId = outletId;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      totalOrders,
      totalRevenue,
      statusBreakdown,
      typeBreakdown,
      recentOrders
    ] = await Promise.all([
      // Total orders count
      prisma.order.count({ where }),
      
      // Total revenue
      prisma.order.aggregate({
        where,
        _sum: { totalAmount: true }
      }),
      
      // Status breakdown
      prisma.order.groupBy({
        by: ['status'],
        where,
        _count: { id: true }
      }),
      
      // Type breakdown
      prisma.order.groupBy({
        by: ['orderType'],
        where,
        _count: { id: true }
      }),
      
      // Recent orders (last 10)
      prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      statusBreakdown: statusBreakdown.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      typeBreakdown: typeBreakdown.reduce((acc, item) => {
        acc[item.orderType] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      recentOrders
    };
  }
};