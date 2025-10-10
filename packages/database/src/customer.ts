// ============================================================================
// NEW: CORRECT DUAL ID CUSTOMER FUNCTIONS
// ============================================================================
// This file contains only the correct customer functions that follow the dual ID system:
// - Input: id (number)
// - Database: queries by id, uses CUIDs for relationships
// - Return: includes both id (CUID) and id (number)

import { prisma } from './client';
import type { 
  CustomerInput, 
  CustomerUpdateInput, 
  CustomerSearchFilter,
  CustomerSearchResult,
  CustomerSearchResponse 
} from '@rentalshop/types';

// ============================================================================
// CUSTOMER LOOKUP FUNCTIONS (BY PUBLIC ID)
// ============================================================================

/**
 * Get customer by public ID and merchant - follows dual ID system
 * Input: id (number) and merchantId (number), Output: Customer with relations
 */
export async function getCustomerByPublicId(id: number, merchantId: number) {
  // Find merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${merchantId} not found`);
  }

  return await prisma.customer.findFirst({
    where: { 
      id,
      merchantId: merchant.id // Use CUID for merchant
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
      orders: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
      },
    },
  });
}

/**
 * Get customer by email and merchant - follows dual ID system
 */
export async function getCustomerByEmail(email: string, merchantId: number) {
  // Find merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${merchantId} not found`);
  }

  return await prisma.customer.findFirst({
    where: {
      merchantId: merchant.id, // Use CUID
      email: email,
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Get customer by phone and merchant - follows dual ID system
 */
export async function getCustomerByPhone(phone: string, merchantId: number) {
  // Find merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${merchantId} not found`);
  }

  return await prisma.customer.findFirst({
    where: {
      merchantId: merchant.id, // Use CUID
      phone: phone,
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

// ============================================================================
// CUSTOMER CREATION FUNCTIONS
// ============================================================================

/**
 * Create new customer - follows dual ID system
 * Input: ids (numbers), Output: id (number)
 */
export async function createCustomer(input: CustomerInput): Promise<any> {
  // Find merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: input.merchantId }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${input.merchantId} not found`);
  }

  // Generate next customer id
  const lastCustomer = await prisma.customer.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true }
  });
  const nextPublicId = (lastCustomer?.id || 0) + 1;

  // Create customer
  const customer = await prisma.customer.create({
    data: {
      id: nextPublicId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email && input.email.trim() !== '' ? input.email : null,
      phone: input.phone,
      address: input.address,
      city: input.city,
      state: input.state,
      zipCode: input.zipCode,
      country: input.country,
      dateOfBirth: input.dateOfBirth,
      idNumber: input.idNumber,
      idType: input.idType,
      notes: input.notes,
      isActive: true, // Default to true
      merchantId: merchant.id, // Use CUID
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return customer;
}

// ============================================================================
// CUSTOMER UPDATE FUNCTIONS
// ============================================================================

/**
 * Update customer - follows dual ID system
 * Input: id (number), Output: id (number)
 */
export async function updateCustomer(
  id: number,
  input: CustomerUpdateInput
): Promise<any> {
  // Find customer by id
  const existingCustomer = await prisma.customer.findUnique({
    where: { id }
  });

  if (!existingCustomer) {
    throw new Error(`Customer with id ${id} not found`);
  }

  // Update customer
  const updatedCustomer = await prisma.customer.update({
    where: { id },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      address: input.address,
      city: input.city,
      state: input.state,
      zipCode: input.zipCode,
      country: input.country,
      dateOfBirth: input.dateOfBirth,
      idNumber: input.idNumber,
      idType: input.idType,
      notes: input.notes,
      isActive: input.isActive,
    },
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return updatedCustomer;
}

// ============================================================================
// CUSTOMER SEARCH FUNCTIONS
// ============================================================================

/**
 * Build order by clause for customer queries
 */
function buildCustomerOrderByClause(sortBy?: string, sortOrder?: string): any {
  const validSortFields = [
    'createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'phone'
  ];
  
  const field = validSortFields.includes(sortBy || '') ? sortBy : 'createdAt';
  const order = sortOrder === 'asc' ? 'asc' : 'desc';
  
  return { [field as string]: order };
}

/**
 * Search customers - follows dual ID system
 * Input: ids (numbers), Output: ids (numbers)
 */
export async function searchCustomers(
  filters: CustomerSearchFilter
): Promise<CustomerSearchResponse> {
  const {
    q,
    merchantId,
    isActive,
    city,
    state,
    country,
    idType,
    limit = 20,
    offset = 0,
    sortBy,
    sortOrder
  } = filters;

  // Build where conditions
  const where: any = {};

  if (merchantId) {
    // Find merchant by id
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true }
    });
    
    if (merchant) {
      where.merchantId = merchant.id; // Use CUID
    }
  }

  // Default to active customers only
  if (isActive !== undefined) {
    where.isActive = isActive;
  } else {
    where.isActive = true;
  }

  if (city) {
    where.city = { contains: city.toLowerCase() };
  }

  if (state) {
    where.state = { contains: state.toLowerCase() };
  }

  if (country) {
    where.country = { contains: country.toLowerCase() };
  }

  if (idType) {
    where.idType = idType;
  }

  // Search query for name, email, phone, or idNumber
  if (q && q.trim()) {
    const searchQuery = q.toLowerCase().trim();
    where.OR = [
      { firstName: { contains: searchQuery } },
      { lastName: { contains: searchQuery } },
      { email: { contains: searchQuery } },
      { phone: { contains: searchQuery } }
    ];
  }

  // Get total count
  const total = await prisma.customer.count({ where });

  // Get customers with pagination
  const customers = await prisma.customer.findMany({
    where,
    include: {
      merchant: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: buildCustomerOrderByClause(sortBy, sortOrder),
    take: limit,
    skip: offset
  });

  // Transform to match CustomerSearchResult type
  const transformedCustomers: CustomerSearchResult[] = customers.map((customer: any) => ({
    id: customer.id, // Use id (number) as required by CustomerSearchResult
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email || '',
    phone: customer.phone,
    address: customer.address || undefined,
    city: customer.city || undefined,
    state: customer.state || undefined,
    zipCode: customer.zipCode || undefined,
    country: customer.country || undefined,
    dateOfBirth: customer.dateOfBirth || undefined,
    idNumber: customer.idNumber || undefined,
    idType: customer.idType as any,
    notes: customer.notes || undefined,
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    merchantId: customer.merchant.id, // Add merchantId as required
    merchant: {
      id: customer.merchant.id, // Use id (number) as required
      name: customer.merchant.name,
    },
  }));

  return {
    success: true,
    data: {
      customers: transformedCustomers as any, // Type assertion to handle CustomerWithMerchant mismatch
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
      offset,
      hasMore: offset + limit < total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ============================================================================
// CUSTOMER UTILITY FUNCTIONS
// ============================================================================

/**
 * Get customers by merchant - follows dual ID system
 */
export async function getCustomersByMerchant(merchantId: number) {
  // Find merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${merchantId} not found`);
  }

  return await prisma.customer.findMany({
    where: { merchantId: merchant.id }, // Use CUID
    include: {
      merchant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Check if customer exists by email - follows dual ID system
 */
export async function customerExistsByEmail(email: string, merchantId: number): Promise<boolean> {
  // Find merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${merchantId} not found`);
  }

  const customer = await prisma.customer.findFirst({
    where: {
      merchantId: merchant.id, // Use CUID
      email: email,
    },
  });

  return !!customer;
}

/**
 * Check if customer exists by phone - follows dual ID system
 */
export async function customerExistsByPhone(phone: string, merchantId: number): Promise<boolean> {
  // Find merchant by id
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with id ${merchantId} not found`);
  }

  const customer = await prisma.customer.findFirst({
    where: {
      merchantId: merchant.id, // Use CUID
      phone: phone,
    },
  });

  return !!customer;
}

// ============================================================================
// SIMPLIFIED API FUNCTIONS (for db object)
// ============================================================================

export const simplifiedCustomers = {
  /**
   * Find customer by ID (simplified API)
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
   * Create new customer (simplified API)
   */
  create: async (data: any) => {
    // Handle optional email field - convert empty string to null
    const customerData = {
      ...data,
      email: data.email && data.email.trim() !== '' ? data.email : null
    };
    
    // Remove merchant connection from data since it's handled by Prisma relations
    delete customerData.merchant;
    
    return await prisma.customer.create({
      data: customerData,
      include: {
        merchant: { select: { id: true, name: true } }
      }
    });
  },

  /**
   * Update customer (simplified API)
   */
  update: async (id: number, data: any) => {
    return await prisma.customer.update({
      where: { id },
      data,
      include: {
        merchant: { select: { id: true, name: true } }
      }
    });
  },

  /**
   * Search customers with pagination (simplified API)
   */
  search: async (filters: any) => {
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
  },

  /**
   * Get customer statistics (simplified API)
   */
  getStats: async (whereClause?: any) => {
    // Handle both direct where clause and object with where property
    const where = whereClause?.where || whereClause || {};
    return await prisma.customer.count({ where });
  }
};
