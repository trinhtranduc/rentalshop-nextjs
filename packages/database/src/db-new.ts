// ============================================================================
// SIMPLIFIED DATABASE API - NEW APPROACH
// ============================================================================
// This is a new, simplified approach to replace the complex dual ID system
// Goal: Reduce from 139 exports to ~10 simple functions

import { prisma } from './client';
import type { Prisma } from '@prisma/client';

// ============================================================================
// TYPES FOR SIMPLIFIED API
// ============================================================================

export interface SimpleFilters {
  merchantId?: number;
  outletId?: number;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SimpleResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================================
// SIMPLIFIED DATABASE API
// ============================================================================

/**
 * Simplified database operations
 * Replaces the complex dual ID system with simple, consistent operations
 */
const db = {
  // ============================================================================
  // USER OPERATIONS
  // ============================================================================
  users: {
    /**
     * Find user by ID (simple, no dual ID complexity)
     */
    findById: async (id: number) => {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          merchant: { select: { id: true, name: true } },
          outlet: { select: { id: true, name: true } }
        }
      });
    },

    /**
     * Find user by email
     */
    findByEmail: async (email: string) => {
      return await prisma.user.findUnique({
        where: { email },
        include: {
          merchant: { select: { id: true, name: true } },
          outlet: { select: { id: true, name: true } }
        }
      });
    },

    /**
     * Create new user
     */
    create: async (data: Prisma.UserCreateInput) => {
      return await prisma.user.create({
        data,
        include: {
          merchant: { select: { id: true, name: true } },
          outlet: { select: { id: true, name: true } }
        }
      });
    },

    /**
     * Update user
     */
    update: async (id: number, data: Prisma.UserUpdateInput) => {
      return await prisma.user.update({
        where: { id },
        data,
        include: {
          merchant: { select: { id: true, name: true } },
          outlet: { select: { id: true, name: true } }
        }
      });
    },

    /**
     * Delete user (soft delete)
     */
    delete: async (id: number) => {
      return await prisma.user.update({
        where: { id },
        data: { 
          isActive: false,
          deletedAt: new Date()
        }
      });
    },

    /**
     * Search users with simple filters
     */
    search: async (filters: SimpleFilters & { role?: string }): Promise<SimpleResponse<any>> => {
      const { page = 1, limit = 20, ...whereFilters } = filters;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      
      if (whereFilters.merchantId) where.merchantId = whereFilters.merchantId;
      if (whereFilters.outletId) where.outletId = whereFilters.outletId;
      if (whereFilters.isActive !== undefined) where.isActive = whereFilters.isActive;
      if (whereFilters.role) where.role = whereFilters.role;
      
      // Text search
      if (whereFilters.search) {
        where.OR = [
          { firstName: { contains: whereFilters.search } },
          { lastName: { contains: whereFilters.search } },
          { email: { contains: whereFilters.search } }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          include: {
            merchant: { select: { id: true, name: true } },
            outlet: { select: { id: true, name: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.user.count({ where })
      ]);

      return {
        data: users,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      };
    }
  },

  // ============================================================================
  // CUSTOMER OPERATIONS
  // ============================================================================
  customers: {
    /**
     * Find customer by ID
     */
    findById: async (id: number) => {
      return await prisma.customer.findUnique({
        where: { id },
        include: {
          merchant: { select: { id: true, name: true } },
          orders: {
            select: { id: true, orderNumber: true, totalAmount: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      });
    },

    /**
     * Create new customer
     */
    create: async (data: Prisma.CustomerCreateInput) => {
      return await prisma.customer.create({
        data,
        include: {
          merchant: { select: { id: true, name: true } }
        }
      });
    },

    /**
     * Update customer
     */
    update: async (id: number, data: Prisma.CustomerUpdateInput) => {
      return await prisma.customer.update({
        where: { id },
        data,
        include: {
          merchant: { select: { id: true, name: true } }
        }
      });
    },

    /**
     * Search customers with pagination
     */
    search: async (filters: SimpleFilters & {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      city?: string;
      state?: string;
      country?: string;
    }): Promise<SimpleResponse<any>> => {
      const { page = 1, limit = 20, ...whereFilters } = filters;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      
      if (whereFilters.merchantId) where.merchantId = whereFilters.merchantId;
      if (whereFilters.outletId) where.outletId = whereFilters.outletId;
      if (whereFilters.isActive !== undefined) where.isActive = whereFilters.isActive;
      
      // Text search across multiple fields
      if (whereFilters.search) {
        where.OR = [
          { firstName: { contains: whereFilters.search } },
          { lastName: { contains: whereFilters.search } },
          { email: { contains: whereFilters.search } },
          { phone: { contains: whereFilters.search } }
        ];
      }

      // Specific field filters
      if (whereFilters.firstName) where.firstName = { contains: whereFilters.firstName };
      if (whereFilters.lastName) where.lastName = { contains: whereFilters.lastName };
      if (whereFilters.email) where.email = { contains: whereFilters.email };
      if (whereFilters.phone) where.phone = { contains: whereFilters.phone };
      if (whereFilters.city) where.city = { contains: whereFilters.city };
      if (whereFilters.state) where.state = { contains: whereFilters.state };
      if (whereFilters.country) where.country = { contains: whereFilters.country };

      const [customers, total] = await Promise.all([
        prisma.customer.findMany({
          where,
          include: {
            merchant: { select: { id: true, name: true } },
            _count: {
              select: { orders: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.customer.count({ where })
      ]);

      return {
        data: customers,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      };
    }
  },

  // ============================================================================
  // PRODUCT OPERATIONS
  // ============================================================================
  products: {
    /**
     * Find product by ID
     */
    findById: async (id: number) => {
      return await prisma.product.findUnique({
        where: { id },
        include: {
          merchant: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          outletStock: {
            include: {
              outlet: { select: { id: true, name: true } }
            }
          }
        }
      });
    },

    /**
     * Find product by barcode
     */
    findByBarcode: async (barcode: string) => {
      return await prisma.product.findUnique({
        where: { barcode },
        include: {
          merchant: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          outletStock: {
            include: {
              outlet: { select: { id: true, name: true } }
            }
          }
        }
      });
    },

    /**
     * Create new product
     */
    create: async (data: Prisma.ProductCreateInput) => {
      return await prisma.product.create({
        data,
        include: {
          merchant: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          outletStock: {
            include: {
              outlet: { select: { id: true, name: true } }
            }
          }
        }
      });
    },

    /**
     * Update product
     */
    update: async (id: number, data: Prisma.ProductUpdateInput) => {
      return await prisma.product.update({
        where: { id },
        data,
        include: {
          merchant: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
          outletStock: {
            include: {
              outlet: { select: { id: true, name: true } }
            }
          }
        }
      });
    },

    /**
     * Delete product (soft delete)
     */
    delete: async (id: number) => {
      return await prisma.product.update({
        where: { id },
        data: { isActive: false }
      });
    },

    /**
     * Search products with simple filters
     */
    search: async (filters: SimpleFilters & { 
      categoryId?: number;
      minPrice?: number;
      maxPrice?: number;
      available?: boolean;
    }): Promise<SimpleResponse<any>> => {
      const { page = 1, limit = 20, ...whereFilters } = filters;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      
      if (whereFilters.merchantId) where.merchantId = whereFilters.merchantId;
      if (whereFilters.categoryId) where.categoryId = whereFilters.categoryId;
      if (whereFilters.isActive !== undefined) where.isActive = whereFilters.isActive;
      
      // Text search
      if (whereFilters.search) {
        where.OR = [
          { name: { contains: whereFilters.search } },
          { description: { contains: whereFilters.search } },
          { barcode: { contains: whereFilters.search } }
        ];
      }

      // Price range
      if (whereFilters.minPrice !== undefined || whereFilters.maxPrice !== undefined) {
        where.rentPrice = {};
        if (whereFilters.minPrice !== undefined) where.rentPrice.gte = whereFilters.minPrice;
        if (whereFilters.maxPrice !== undefined) where.rentPrice.lte = whereFilters.maxPrice;
      }

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            merchant: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
            outletStock: {
              include: {
                outlet: { select: { id: true, name: true } }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.product.count({ where })
      ]);

      return {
        data: products,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      };
    }
  },

  // ============================================================================
  // ORDER OPERATIONS
  // ============================================================================
  orders: {
    /**
     * Find order by ID
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
     * Find order by order number
     */
    findByNumber: async (orderNumber: string) => {
      return await prisma.order.findUnique({
        where: { orderNumber },
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
     * Create new order
     */
    create: async (data: Prisma.OrderCreateInput) => {
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
     * Update order
     */
    update: async (id: number, data: Prisma.OrderUpdateInput) => {
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
     * Delete order
     */
    delete: async (id: number) => {
      return await prisma.order.delete({
        where: { id }
      });
    },

    /**
     * Search orders with simple filters
     */
    search: async (filters: SimpleFilters & {
      customerId?: number;
      status?: string;
      orderType?: string;
      startDate?: Date;
      endDate?: Date;
    }): Promise<SimpleResponse<any>> => {
      const { page = 1, limit = 20, ...whereFilters } = filters;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      
      if (whereFilters.outletId) where.outletId = whereFilters.outletId;
      if (whereFilters.customerId) where.customerId = whereFilters.customerId;
      if (whereFilters.status) where.status = whereFilters.status;
      if (whereFilters.orderType) where.orderType = whereFilters.orderType;
      
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
        prisma.order.findMany({
          where,
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
          },
          orderBy: { createdAt: 'desc' },
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
    }
  },

  // ============================================================================
  // OUTLET OPERATIONS
  // ============================================================================
  outlets: {
    /**
     * Find outlet by ID
     */
    findById: async (id: number) => {
      return await prisma.outlet.findUnique({
        where: { id },
        include: {
          merchant: { select: { id: true, name: true } },
          _count: {
            select: { 
              users: true,
              orders: true,
              products: true
            }
          }
        }
      });
    },

    /**
     * Create new outlet
     */
    create: async (data: Prisma.OutletCreateInput) => {
      return await prisma.outlet.create({
        data,
        include: {
          merchant: { select: { id: true, name: true } }
        }
      });
    },

    /**
     * Update outlet
     */
    update: async (id: number, data: Prisma.OutletUpdateInput) => {
      return await prisma.outlet.update({
        where: { id },
        data,
        include: {
          merchant: { select: { id: true, name: true } }
        }
      });
    },

    /**
     * Search outlets with pagination
     */
    search: async (filters: SimpleFilters & {
      merchantId?: number;
      outletId?: number;
      name?: string;
      address?: string;
      phone?: string;
      email?: string;
      isActive?: boolean;
      status?: string;
    }): Promise<SimpleResponse<any>> => {
      const { page = 1, limit = 20, ...whereFilters } = filters;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      
      if (whereFilters.merchantId) where.merchantId = whereFilters.merchantId;
      if (whereFilters.outletId) where.id = whereFilters.outletId;
      if (whereFilters.isActive !== undefined) where.isActive = whereFilters.isActive;
      if (whereFilters.status) where.status = whereFilters.status;
      
      // Text search across multiple fields
      if (whereFilters.search) {
        where.OR = [
          { name: { contains: whereFilters.search } },
          { address: { contains: whereFilters.search } },
          { phone: { contains: whereFilters.search } },
          { email: { contains: whereFilters.search } }
        ];
      }

      // Specific field filters
      if (whereFilters.name) where.name = { contains: whereFilters.name };
      if (whereFilters.address) where.address = { contains: whereFilters.address };
      if (whereFilters.phone) where.phone = { contains: whereFilters.phone };
      if (whereFilters.email) where.email = { contains: whereFilters.email };

      const [outlets, total] = await Promise.all([
        prisma.outlet.findMany({
          where,
          include: {
            merchant: { select: { id: true, name: true } },
            _count: {
              select: { 
                users: true,
                orders: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.outlet.count({ where })
      ]);

      return {
        data: outlets,
        total,
        page,
        limit,
        hasMore: skip + limit < total
      };
    }
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check database connection health
 */
const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'connected' };
  } catch (error) {
    return { status: 'disconnected', error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

/**
 * Generate next order number (simplified)
 */
const generateOrderNumber = async (outletId: number): Promise<string> => {
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true }
  });

  if (!outlet) {
    throw new Error(`Outlet with id ${outletId} not found`);
  }

  // Get the count of orders for this outlet
  const orderCount = await prisma.order.count({
    where: { outletId }
  });

  const sequence = (orderCount + 1).toString().padStart(4, '0');
  return `ORD-${outletId.toString().padStart(3, '0')}-${sequence}`;
};

// ============================================================================
// EXPORTS
// ============================================================================

export { prisma } from './client';
export { db, checkDatabaseConnection, generateOrderNumber };
