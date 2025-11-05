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
 * Get customer by public ID - follows dual ID system
 * Input: id (number), Output: Customer with relations
 * Note: Tenant databases are already isolated per tenant, merchantId not needed
 */
export async function getCustomerByPublicId(id: number) {
  return await prisma.customer.findFirst({
    where: { id },
    include: {
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
 * Get customer by email
 * Note: In multi-tenant setup, tenant databases are already isolated per tenant
 */
export async function getCustomerByEmail(email: string) {
  return await prisma.customer.findFirst({
    where: { email },
  });
}

/**
 * Get customer by phone
 * Note: In multi-tenant setup, tenant databases are already isolated per tenant
 */
export async function getCustomerByPhone(phone: string) {
  return await prisma.customer.findFirst({
    where: { phone },
  });
}

// ============================================================================
// CUSTOMER CREATION FUNCTIONS
// ============================================================================

/**
 * Create new customer - follows dual ID system
 * Input: ids (numbers), Output: id (number)
 * Note: Tenant databases are already isolated per tenant, merchantId not needed
 */
export async function createCustomer(input: CustomerInput): Promise<any> {
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

  // Note: merchantId filtering removed - tenant databases are already isolated per tenant

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

  // Search query for name, email, phone, or idNumber (case-insensitive)
  if (q && q.trim()) {
    const searchQuery = q.trim();
    where.OR = [
      { firstName: { contains: searchQuery, mode: 'insensitive' } },
      { lastName: { contains: searchQuery, mode: 'insensitive' } },
      { email: { contains: searchQuery, mode: 'insensitive' } },
      { phone: { contains: searchQuery } } // Phone numbers are usually exact match
    ];
  }

  // Get total count
  const total = await prisma.customer.count({ where });

  // Get customers with pagination
  const customers = await prisma.customer.findMany({
    where,
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
 * Get all customers
 * Note: Tenant databases are already isolated per tenant, merchantId not needed
 * This function replaces getCustomersByMerchant
 */
export async function getAllCustomers() {
  return await prisma.customer.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Check if customer exists by email
 * Note: Tenant databases are already isolated per tenant, merchantId not needed
 */
export async function customerExistsByEmail(email: string): Promise<boolean> {
  const customer = await prisma.customer.findFirst({
    where: {
      email: email,
    },
  });

  return !!customer;
}

/**
 * Check if customer exists by phone
 * Note: Tenant databases are already isolated per tenant, merchantId not needed
 */
export async function customerExistsByPhone(phone: string): Promise<boolean> {
  const customer = await prisma.customer.findFirst({
    where: {
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
    });
  },

  /**
   * Update customer (simplified API)
   */
  update: async (id: number, data: any) => {
    return await prisma.customer.update({
      where: { id },
      data,
    });
  },

  /**
   * Search customers with pagination (simplified API)
   */
  search: async (filters: any) => {
    const { 
      page = 1, 
      limit = 20, 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      ...whereFilters 
    } = filters;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    // Note: merchantId filtering removed - tenant databases are already isolated per tenant
    if (whereFilters.outletId) where.outletId = whereFilters.outletId;
    // Default to active customers only unless explicitly requesting all
    if (whereFilters.isActive !== undefined) {
      where.isActive = whereFilters.isActive;
    } else {
      where.isActive = true; // Default: only show active customers
    }
    
    // Text search across multiple fields (case-insensitive)
    if (whereFilters.search) {
      const searchTerm = whereFilters.search.trim();
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Specific field filters (case-insensitive)
    if (whereFilters.firstName) where.firstName = { contains: whereFilters.firstName, mode: 'insensitive' };
    if (whereFilters.lastName) where.lastName = { contains: whereFilters.lastName, mode: 'insensitive' };
    if (whereFilters.email) where.email = { contains: whereFilters.email, mode: 'insensitive' };
    if (whereFilters.phone) where.phone = { contains: whereFilters.phone, mode: 'insensitive' };
    if (whereFilters.city) where.city = { contains: whereFilters.city, mode: 'insensitive' };
    if (whereFilters.state) where.state = { contains: whereFilters.state, mode: 'insensitive' };
    if (whereFilters.country) where.country = { contains: whereFilters.country, mode: 'insensitive' };

    // ✅ Build dynamic orderBy clause
    const orderBy: any = {};
    if (sortBy === 'firstName' || sortBy === 'lastName' || sortBy === 'email' || sortBy === 'phone') {
      orderBy[sortBy] = sortOrder;
    } else {
      // Default: createdAt
      orderBy.createdAt = sortOrder;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: { orders: true }
          }
        },
        orderBy, // ✅ Dynamic sorting
        skip,
        take: limit
      }),
      prisma.customer.count({ where })
    ]);

    console.log(`📊 db.customers.search: page=${page}, skip=${skip}, limit=${limit}, total=${total}, customers=${customers.length}`);

    return {
      data: customers,
      total,
      page,
      limit,
      hasMore: skip + limit < total,
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * Delete customer (soft delete) (simplified API)
   */
  delete: async (id: number) => {
    return await prisma.customer.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
  },

  /**
   * Find first customer matching criteria (simplified API)
   */
  findFirst: async (whereClause: any) => {
    // Handle both direct where clause and object with where property
    const where = whereClause?.where || whereClause || {};
    return await prisma.customer.findFirst({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
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
