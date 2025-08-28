// ============================================================================
// NEW: CORRECT DUAL ID ORDER FUNCTIONS
// ============================================================================
// This file contains only the correct order functions that follow the dual ID system:
// - Input: publicId (number)
// - Database: queries by publicId, uses CUIDs for relationships
// - Return: includes both id (CUID) and publicId (number)

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
// ORDER LOOKUP FUNCTIONS (BY PUBLIC ID)
// ============================================================================

/**
 * Get order by publicId (number) with all details - follows dual ID system
 */
export async function getOrderByPublicId(publicId: number): Promise<OrderWithDetails | null> {
  const order = await prisma.order.findUnique({
    where: { publicId },
    include: {
      customer: {
        select: {
          id: true,
          publicId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      outlet: {
        select: {
          id: true,
          publicId: true,
          name: true,
          address: true,
          merchantId: true,
          merchant: {
            select: {
              id: true,
              publicId: true,
              name: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          publicId: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
      orderItems: {
        include: {
          product: {
            select: {
              id: true,
              publicId: true,
              name: true,
              description: true,
              images: true,
              barcode: true,
            },
          },
        },
      },
      payments: true,
    },
  });

  if (!order) return null;

  // Type assertion to handle included relations
  const orderWithRelations = order as any;

  // Transform the data to match OrderWithDetails interface
  const transformedOrder = {
    ...order,
    // Map IDs to publicIds for frontend compatibility
    outletId: orderWithRelations.outlet?.publicId, // Frontend expects publicId (number)
    customerId: orderWithRelations.customer?.publicId, // Frontend expects publicId (number)
    // Add merchantId for backward compatibility with database package
    merchantId: orderWithRelations.outlet?.merchantId,
    // Transform orderItems to unified OrderItemFormData format
    orderItems: orderWithRelations.orderItems.map((item: any) => ({
      id: item.id, // Keep database CUID for existing items
      productId: item.product.publicId, // Frontend uses publicId (number)
      product: {
        id: item.product.publicId, // Frontend uses publicId (number)
        publicId: item.product.publicId, // Keep publicId for reference
        name: item.product.name,
        description: item.product.description,
        images: item.product.images,
        barcode: item.product.barcode,
        rentPrice: 0, // Will be populated from product data
        deposit: 0, // Will be populated from product data
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      rentalDays: item.rentalDays || 0,
      deposit: 0, // Will be populated from product data
      notes: item.notes || '',
    })),
    // Transform payments to match Payment interface (database returns CUIDs, interface expects numbers)
    payments: orderWithRelations.payments.map((payment: any) => ({
      ...payment,
      id: 0, // Placeholder since Payment interface expects number but database returns string
      orderId: 0, // Placeholder since Payment interface expects number but database returns string
    })),
  };

  return transformedOrder as any; // Type assertion to handle the transformed structure
}

/**
 * Get order by order number - follows dual ID system
 */
export async function getOrderByNumber(orderNumber: string): Promise<OrderWithDetails | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      customer: {
        select: {
          id: true,
          publicId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      outlet: {
        select: {
          id: true,
          publicId: true,
          name: true,
          address: true,
          merchantId: true,
          merchant: {
            select: {
              id: true,
              publicId: true,
              name: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          publicId: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
      orderItems: {
        include: {
          product: {
            select: {
              id: true,
              publicId: true,
              name: true,
              description: true,
              images: true,
              barcode: true,
            },
          },
        },
      },
      payments: true,
    },
  });

  if (!order) return null;

  // Type assertion to handle included relations
  const orderWithRelations = order as any;

  // Transform the data to match OrderWithDetails interface
  const transformedOrder = {
    ...order,
    // Map IDs to publicIds for frontend compatibility
    outletId: orderWithRelations.outlet?.publicId, // Frontend expects publicId (number)
    customerId: orderWithRelations.customer?.publicId, // Frontend expects publicId (number)
    merchantId: orderWithRelations.outlet?.merchantId,
    orderItems: orderWithRelations.orderItems.map((item: any) => ({
      id: item.id, // Keep database CUID for existing items
      productId: item.product.publicId, // Frontend uses publicId (number)
      product: {
        id: item.product.publicId, // Frontend uses publicId (number)
        publicId: item.product.publicId, // Keep publicId for reference
        name: item.product.name,
        description: item.product.description,
        images: item.product.images,
        barcode: item.product.barcode,
        rentPrice: 0, // Will be populated from product data
        deposit: 0, // Will be populated from product data
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      rentalDays: item.rentalDays || 0,
      deposit: 0, // Will be populated from product data
      notes: item.notes || '',
    })),
    payments: orderWithRelations.payments.map((payment: any) => ({
      ...payment,
      id: 0, // Placeholder since Payment interface expects number but database returns string
      orderId: 0, // Placeholder since Payment interface expects number but database returns string
    })),
  };

  return transformedOrder as any; // Type assertion to handle the transformed structure
}

// ============================================================================
// ORDER CREATION FUNCTIONS
// ============================================================================

/**
 * Create new order - follows dual ID system
 * Input: publicIds (numbers), Output: publicId (number)
 */
export async function createOrder(
  input: OrderInput,
  userId: number
): Promise<OrderWithDetails> {
  // Start transaction
  const result = await prisma.$transaction(async (tx) => {
    // Find outlet by publicId
    const outlet = await tx.outlet.findUnique({
      where: { publicId: input.outletId }
    });
    if (!outlet) {
      throw new Error(`Outlet with publicId ${input.outletId} not found`);
    }

    // Find customer by publicId if provided
    let customer = null;
    if (input.customerId) {
      customer = await tx.customer.findUnique({
        where: { publicId: input.customerId }
      });
      if (!customer) {
        throw new Error(`Customer with publicId ${input.customerId} not found`);
      }
    }

    // Find user by publicId
    const user = await tx.user.findUnique({
      where: { publicId: userId }
    });
    if (!user) {
      throw new Error(`User with publicId ${userId} not found`);
    }

    // Generate next order publicId
    const lastOrder = await tx.order.findFirst({
      orderBy: { publicId: 'desc' },
      select: { publicId: true }
    });
    const nextPublicId = (lastOrder?.publicId || 0) + 1;

    // Generate order number: ORD-{outletId}-{sequence}
    // Get next sequence for this specific outlet
    const lastOrderInOutlet = await tx.order.findFirst({
      where: { outletId: outlet.id },
      orderBy: { publicId: 'desc' },
      select: { publicId: true }
    });
    
    const nextSequence = (lastOrderInOutlet?.publicId || 0) + 1;
    const orderNumber = `ORD-${outlet.publicId.toString().padStart(3, '0')}-${nextSequence.toString().padStart(4, '0')}`;

    // Create order
    const order = await tx.order.create({
      data: {
        publicId: nextPublicId,
        orderNumber: orderNumber,
        orderType: input.orderType,
        status: 'RESERVED',
        outletId: outlet.id, // Use CUID
        customerId: customer?.id || null, // Use CUID
        createdById: user.id, // Use CUID of user who created the order
        totalAmount: input.totalAmount,
        depositAmount: input.depositAmount || 0,
        securityDeposit: input.securityDeposit || 0,
        damageFee: input.damageFee || 0,
        lateFee: input.lateFee || 0,
        discountType: input.discountType || 'amount',
        discountValue: input.discountValue || 0,
        discountAmount: input.discountAmount || 0,
        pickupPlanAt: input.pickupPlanAt,
        returnPlanAt: input.returnPlanAt,
        notes: input.notes,
        isReadyToDeliver: input.isReadyToDeliver || false,
      },
      include: {
        customer: {
          select: {
            id: true,
            publicId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        outlet: {
          select: {
            id: true,
            publicId: true,
            name: true,
            address: true,
            merchantId: true,
            merchant: {
              select: {
                id: true,
                publicId: true,
                name: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            publicId: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                publicId: true,
                name: true,
                description: true,
                images: true,
                barcode: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    // Create order items
    if (input.orderItems && input.orderItems.length > 0) {
      for (const item of input.orderItems) {
        // Find product by publicId
        const product = await tx.product.findUnique({
          where: { publicId: item.productId }
        });
        if (!product) {
          throw new Error(`Product with publicId ${item.productId} not found`);
        }

        // Create order item
        await tx.orderItem.create({
          data: {
            orderId: order.id, // Use CUID
            productId: product.id, // Use CUID
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            rentalDays: item.rentalDays,
            notes: item.notes,
          },
        });

        // Update outlet stock - check if outletStock table exists first
        try {
          await tx.outletStock.upsert({
            where: {
              productId_outletId: {
                productId: product.id, // Use CUID
                outletId: outlet.id, // Use CUID
              },
            },
            update: {
              renting: { increment: item.quantity },
              available: { decrement: item.quantity },
            },
            create: {
              outletId: outlet.id, // Use CUID
              productId: product.id, // Use CUID
              stock: 0,
              renting: item.quantity,
              available: -item.quantity,
            },
          });
        } catch (error) {
          // If outletStock table doesn't exist, skip stock update
          console.warn('OutletStock table not found, skipping stock update');
        }
      }
    }

    // Fetch the complete order with all items and relationships
    const completeOrder = await tx.order.findUnique({
      where: { id: order.id },
      include: {
        customer: {
          select: {
            id: true,
            publicId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        outlet: {
          select: {
            id: true,
            publicId: true,
            name: true,
            address: true,
            merchantId: true,
            merchant: {
              select: {
                id: true,
                publicId: true,
                name: true,
              },
            },
          },
        },
        createdBy: {
          select: {
            id: true,
            publicId: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                publicId: true,
                name: true,
                description: true,
                images: true,
                barcode: true,
              },
            },
          },
        },
        payments: true,
      },
    });

    return completeOrder;
  });

  // Return the created order with all details
  // The transaction returns the completeOrder with all relations
  // We need to transform it to match the expected interface
  if (!result) {
    throw new Error('Failed to create order');
  }

  // Type assertion since we know the transaction returns the complete order
  const completeOrder = result as any;
  
  const transformedResult = {
    ...completeOrder,
    merchantId: completeOrder.outlet.merchantId,
    orderItems: completeOrder.orderItems.map((item: any) => ({
      id: item.id, // Keep database CUID for existing items
      publicId: 0, // TODO: Add publicId to OrderItem model if needed
      orderId: item.orderId, // Keep database CUID
      productId: item.productId, // Keep database CUID
      product: {
        id: item.product.id, // Keep database CUID
        publicId: item.product.publicId, // Keep publicId for reference
        name: item.product.name,
        description: item.product.description,
        images: item.product.images,
        barcode: item.product.barcode,
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      rentalDays: item.rentalDays || 0,
      deposit: item.deposit || 0,
      notes: item.notes || '',
    })),
    payments: completeOrder.payments.map((payment: any) => ({
      ...payment,
      id: 0, // Placeholder since Payment interface expects number but database returns string
      orderId: 0, // Placeholder since Payment interface expects number but database returns string
    })),
  };

  return transformedResult as OrderWithDetails;
}

// ============================================================================
// ORDER UPDATE FUNCTIONS
// ============================================================================



/**
 * Update order - follows dual ID system
 * Input: publicId (number), Output: publicId (number)
 */
export async function updateOrder(
  publicId: number,
  input: OrderUpdateInput,
  userId: number
): Promise<OrderWithDetails | null> {
  // Find order by publicId
  const existingOrder = await prisma.order.findUnique({
    where: { publicId },
    include: {
      orderItems: true,
    },
  });

  if (!existingOrder) {
    throw new Error(`Order with publicId ${publicId} not found`);
  }

  // Find user by publicId
  const user = await prisma.user.findUnique({
    where: { publicId: userId }
  });
  if (!user) {
    throw new Error(`User with publicId ${userId} not found`);
  }

  // Update order - only update fields that exist in Prisma schema
  const updatedOrder = await prisma.order.update({
    where: { publicId },
    data: {
      status: input.status,
      // Use nested updates for relationships
      ...(input.customerId && {
        customer: {
          connect: { publicId: input.customerId }
        }
      }),
      ...(input.outletId && {
        outlet: {
          connect: { publicId: input.outletId }
        }
      }),
      pickupPlanAt: input.pickupPlanAt,
      returnPlanAt: input.returnPlanAt,
      pickedUpAt: input.pickedUpAt,
      returnedAt: input.returnedAt,
      rentalDuration: input.rentalDuration,
      discountType: input.discountType,
      discountValue: input.discountValue,
      discountAmount: input.discountAmount,
      totalAmount: input.totalAmount,
      depositAmount: input.depositAmount,
      securityDeposit: input.securityDeposit,
      damageFee: input.damageFee,
      lateFee: input.lateFee,
      collateralType: input.collateralType,
      collateralDetails: input.collateralDetails,
      notes: input.notes,
      pickupNotes: input.pickupNotes,
      returnNotes: input.returnNotes,
      damageNotes: input.damageNotes,
      isReadyToDeliver: input.isReadyToDeliver,
    },
    include: {
      customer: {
        select: {
          id: true,
          publicId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      outlet: {
        select: {
          id: true,
          publicId: true,
          name: true,
          address: true,
          merchantId: true,
          merchant: {
            select: {
              id: true,
              publicId: true,
              name: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          publicId: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
      orderItems: {
        include: {
          product: {
            select: {
              id: true,
              publicId: true,
              name: true,
              description: true,
              images: true,
              barcode: true,
            },
          },
        },
      },
      payments: true,
    },
  });

  // Handle order items update if provided
  if (input.orderItems) {
    // Delete existing order items
    await prisma.orderItem.deleteMany({
      where: { orderId: updatedOrder.id }
    });

    // Create new order items
    for (const item of input.orderItems) {
      // Find product by publicId first
      const product = await prisma.product.findUnique({
        where: { publicId: parseInt(item.productId.toString()) }
      });
      if (!product) {
        throw new Error(`Product with publicId ${item.productId} not found`);
      }

      await prisma.orderItem.create({
        data: {
          orderId: updatedOrder.id, // Use CUID
          productId: product.id, // Use CUID
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice || 0,
          deposit: item.deposit || 0,
          notes: item.notes || '',
        }
      });
    }
  }

  // Fetch the updated order with all relations
  const finalOrder = await prisma.order.findUnique({
    where: { publicId },
    include: {
      customer: {
        select: {
          id: true,
          publicId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      outlet: {
        select: {
          id: true,
          publicId: true,
          name: true,
          address: true,
          merchantId: true,
          merchant: {
            select: {
              id: true,
              publicId: true,
              name: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          publicId: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
      orderItems: {
        include: {
          product: {
            select: {
              id: true,
              publicId: true,
              name: true,
              description: true,
              images: true,
              barcode: true,
            },
          },
        },
      },
      payments: true,
    },
  });

  if (!finalOrder) {
    throw new Error('Failed to fetch updated order');
  }

  return {
    ...finalOrder,
    merchantId: finalOrder.outlet.merchantId,
    orderItems: finalOrder.orderItems.map(item => ({
      id: item.id, // Keep database CUID for existing items
      publicId: 0, // TODO: Add publicId to OrderItem model if needed
      orderId: item.orderId, // Keep database CUID
      productId: item.productId, // Keep database CUID
      product: {
        id: item.product.id, // Keep database CUID
        publicId: item.product.publicId, // Keep publicId for reference
        name: item.product.name,
        description: item.product.description,
        images: item.product.images,
        barcode: item.product.barcode,
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      rentalDays: item.rentalDays || 0,
      deposit: item.deposit || 0,
      notes: item.notes || '',
    })),
    payments: finalOrder.payments.map(payment => ({
      ...payment,
      id: 0, // Placeholder since Payment interface expects number but database returns string
      orderId: 0, // Placeholder since Payment interface expects number but database returns string
    })),
  } as OrderWithDetails;
}

// ============================================================================
// ORDER SEARCH FUNCTIONS
// ============================================================================

/**
 * Search orders - follows dual ID system
 * Input: publicIds (numbers), Output: publicIds (numbers)
 */
export async function searchOrders(
  filters: OrderSearchFilter,
  userScope: { merchantId?: number; outletId?: number }
): Promise<OrderSearchResponse> {
  const { limit = 20, offset = 0 } = filters;

  // Build where clause
  const where: any = {};

  // Apply user scope
  if (userScope.merchantId) {
    // Find merchant by publicId to get the CUID
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: userScope.merchantId },
      select: { id: true }
    });
    if (merchant) {
      where.outlet = { merchantId: merchant.id }; // Use CUID for database query
    }
  }
  if (userScope.outletId) {
    // Find outlet by publicId to get the CUID
    const outlet = await prisma.outlet.findUnique({
      where: { publicId: userScope.outletId },
      select: { id: true }
    });
    if (outlet) {
      where.outletId = outlet.id; // Use CUID for database query
    }
  }

  // Apply filters
  if (filters.outletId) {
    // Find outlet by publicId
    const outlet = await prisma.outlet.findUnique({
      where: { publicId: filters.outletId },
      select: { id: true }
    });
    if (outlet) {
      where.outletId = outlet.id; // Use CUID
    }
  }

  if (filters.customerId) {
    // Find customer by publicId
    const customer = await prisma.customer.findUnique({
      where: { publicId: filters.customerId },
      select: { id: true }
    });
    if (customer) {
      where.customerId = customer.id; // Use CUID
    }
  }

  if (filters.userId) {
    // Find user by publicId
    const user = await prisma.user.findUnique({
      where: { publicId: filters.userId },
      select: { id: true }
    });
    if (user) {
      where.userId = user.id; // Use CUID
    }
  }

  if (filters.orderType) {
    where.orderType = filters.orderType;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) where.createdAt.gte = filters.startDate;
    if (filters.endDate) where.createdAt.lte = filters.endDate;
  }

  if (filters.pickupDate) {
    where.pickupPlanAt = filters.pickupDate;
  }

  if (filters.returnDate) {
    where.returnPlanAt = filters.returnDate;
  }

  if (filters.minAmount || filters.maxAmount) {
    where.totalAmount = {};
    if (filters.minAmount) where.totalAmount.gte = filters.minAmount;
    if (filters.maxAmount) where.totalAmount.lte = filters.maxAmount;
  }

  if (filters.isReadyToDeliver !== undefined) {
    where.isReadyToDeliver = filters.isReadyToDeliver;
  }

  // Execute query
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            publicId: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        outlet: {
          select: {
            id: true,
            publicId: true,
            name: true,
            address: true,
            merchantId: true,
            merchant: {
            select: {
              id: true,
              publicId: true,
              name: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          publicId: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      },
      orderItems: {
        include: {
          product: {
            select: {
              id: true,
              publicId: true,
              name: true,
              description: true,
              images: true,
              barcode: true,
            },
          },
        },
      },
      payments: true,
    },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.order.count({ where }),
  ]);

  // Transform to match OrderSearchResult type
  const transformedOrders: OrderSearchResult[] = orders.map(order => ({
    id: order.id, // Use CUID (string)
    publicId: order.publicId,
    orderNumber: order.orderNumber,
    orderType: order.orderType as any,
    status: order.status as any,
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    pickupPlanAt: order.pickupPlanAt,
    returnPlanAt: order.returnPlanAt,
    pickedUpAt: order.pickedUpAt,
    returnedAt: order.returnedAt,
    isReadyToDeliver: order.isReadyToDeliver || false,
    customer: order.customer ? {
      id: order.customer.id, // Use CUID (string)
      publicId: order.customer.publicId,
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      email: order.customer.email,
      phone: order.customer.phone,
    } : null,
    outlet: {
      id: order.outlet.id, // Use CUID (string)
      publicId: order.outlet.publicId,
      name: order.outlet.name,
      address: order.outlet.address,
      merchantId: order.outlet.merchant.id, // Use CUID (string)
      merchant: {
        id: order.outlet.merchant.id, // Use CUID (string)
        publicId: order.outlet.merchant.publicId,
        name: order.outlet.merchant.name,
      },
    },
    orderItems: order.orderItems.map(item => ({
      id: item.id, // Keep CUID for internal use
      publicId: (item as any).publicId || 0, // Add publicId if available
      productId: item.product.publicId, // Return publicId (number)
      product: {
        id: item.product.id, // Use CUID (string)
        publicId: item.product.publicId,
        name: item.product.name,
        description: item.product.description,
        images: item.product.images,
        barcode: item.product.barcode,
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      rentalDays: item.rentalDays,
      notes: item.notes,
    })),
  }));

  return {
    success: true,
    data: {
      orders: transformedOrders,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

// ============================================================================
// ORDER STATISTICS FUNCTIONS
// ============================================================================

/**
 * Get order statistics - follows dual ID system
 */
export async function getOrderStats(
  userScope: { merchantId?: number; outletId?: number }
): Promise<any> {
  const where: any = {};

  // Apply user scope with proper dual ID handling
  if (userScope.merchantId) {
    // Find merchant by publicId to get the CUID
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: userScope.merchantId },
      select: { id: true }
    });
    if (merchant) {
      where.outlet = { merchantId: merchant.id }; // Use CUID for database query
    }
  }
  
  if (userScope.outletId) {
    // Find outlet by publicId to get the CUID
    const outlet = await prisma.outlet.findUnique({
      where: { publicId: userScope.outletId },
      select: { id: true }
    });
    if (outlet) {
      where.outletId = outlet.id; // Use CUID for database query
    }
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
      where: { ...where, status: { in: ['COMPLETED', 'ACTIVE'] } },
      _sum: { totalAmount: true },
    }),
    prisma.order.aggregate({
      where: { ...where, status: { in: ['COMPLETED', 'ACTIVE'] } },
      _sum: { depositAmount: true },
    }),
    prisma.order.count({
      where: { ...where, status: 'ACTIVE' },
    }),
    prisma.order.count({
      where: {
        ...where,
        status: 'ACTIVE',
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
 * Cancel order - follows dual ID system
 * Input: publicId (number), Output: cancelled order data
 */
export async function cancelOrder(publicId: number, userId: number, reason?: string): Promise<any> {
  // Find order by publicId
  const order = await prisma.order.findUnique({
    where: { publicId },
    include: {
      customer: {
        select: {
          id: true,
          publicId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      outlet: {
        select: {
          id: true,
          publicId: true,
          name: true,
          address: true,
          merchantId: true,
          merchant: {
            select: {
              id: true,
              publicId: true,
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
              publicId: true,
              name: true,
              description: true,
              images: true,
              barcode: true,
            },
          },
        },
      },
      payments: true,
    },
  });

  if (!order) {
    throw new Error(`Order with publicId ${publicId} not found`);
  }

  // Update order status to CANCELLED
  const updatedOrder = await prisma.order.update({
    where: { publicId },
    data: {
      status: 'CANCELLED',
      updatedAt: new Date(),
    },
    include: {
      customer: {
        select: {
          id: true,
          publicId: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      outlet: {
        select: {
          id: true,
          publicId: true,
          name: true,
          address: true,
          merchantId: true,
          merchant: {
            select: {
              id: true,
              publicId: true,
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
              publicId: true,
              name: true,
              description: true,
              images: true,
              barcode: true,
            },
          },
        },
      },
      payments: true,
    },
  });

  // Transform to match expected types
  return {
    ...updatedOrder,
    id: updatedOrder.publicId, // Return publicId as "id" for frontend
    merchantId: updatedOrder.outlet.merchantId,
    orderItems: updatedOrder.orderItems.map(item => ({
      id: item.id, // Keep database CUID for existing items
      productId: item.product.publicId, // Frontend uses publicId (number)
      product: {
        id: item.product.publicId, // Frontend uses publicId (number)
        publicId: item.product.publicId, // Keep publicId for reference
        name: item.product.name,
        description: item.product.description,
        images: item.product.images,
        barcode: item.product.barcode,
        rentPrice: 0, // Will be populated from product data
        deposit: 0, // Will be populated from product data
      },
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      rentalDays: item.rentalDays || 0,
      deposit: 0, // Will be populated from product data
      notes: item.notes || '',
    })),
    payments: updatedOrder.payments.map(payment => ({
      ...payment,
      id: 0, // Placeholder since Payment interface expects number but database returns string
      orderId: 0, // Placeholder since Payment interface expects number but database returns string
    })),
  };
}

// ============================================================================
// ORDER UTILITY FUNCTIONS
// ============================================================================

/**
 * Get overdue rentals - follows dual ID system
 * Returns orders that are past their return date
 */
export async function getOverdueRentals(outletId?: number): Promise<any[]> {
  const where: any = {
    orderType: 'RENT',
    status: { in: ['RESERVED', 'PICKUPED'] },
    returnPlanAt: { lt: new Date() }
  };

  if (outletId) {
    // Find outlet by publicId
    const outlet = await prisma.outlet.findUnique({
      where: { publicId: outletId },
      select: { id: true }
    });
    if (outlet) {
      where.outletId = outlet.id; // Use CUID
    }
  }

  const overdueOrders = await prisma.order.findMany({
    where,
    include: {
      customer: {
        select: {
          id: true,
          publicId: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      outlet: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      orderItems: {
        include: {
          product: {
            select: {
              id: true,
              publicId: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { returnPlanAt: 'asc' },
  });

  // Transform to use publicIds as ids
  return overdueOrders.map(order => ({
    id: order.publicId,                    // Use publicId as id
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
    isReadyToDeliver: order.isReadyToDeliver,
    customer: order.customer ? {
      id: order.customer.publicId,         // Use publicId as id
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      phone: order.customer.phone,
    } : null,
    outlet: {
      id: order.outlet.publicId,           // Use publicId as id
      name: order.outlet.name,
    },
    orderItems: order.orderItems.map(item => ({
      id: item.id,                         // Keep CUID for internal use
      productId: item.product.publicId,    // Use publicId as id
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      product: {
        id: item.product.publicId,         // Use publicId as id
        name: item.product.name,
        // Map product.id (CUID) to productId for frontend compatibility
        productId: item.product.publicId, // Frontend uses publicId (number)
        // Map product.publicId to product.publicId for frontend display
        publicId: item.product.publicId, // Keep publicId for reference
      },
    })),
  }));
}
