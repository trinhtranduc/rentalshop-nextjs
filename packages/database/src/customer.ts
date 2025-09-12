// ============================================================================
// NEW: CORRECT DUAL ID CUSTOMER FUNCTIONS
// ============================================================================
// This file contains only the correct customer functions that follow the dual ID system:
// - Input: publicId (number)
// - Database: queries by publicId, uses CUIDs for relationships
// - Return: includes both id (CUID) and publicId (number)

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
 * Input: publicId (number) and merchantId (number), Output: Customer with relations
 */
export async function getCustomerByPublicId(publicId: number, merchantId: number) {
  // Find merchant by publicId
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${merchantId} not found`);
  }

  return await prisma.customer.findFirst({
    where: { 
      publicId,
      merchantId: merchant.id // Use CUID for merchant
    },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
          name: true,
        },
      },
      orders: {
        select: {
          id: true,
          publicId: true,
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
  // Find merchant by publicId
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${merchantId} not found`);
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
          publicId: true,
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
  // Find merchant by publicId
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${merchantId} not found`);
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
          publicId: true,
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
 * Input: publicIds (numbers), Output: publicId (number)
 */
export async function createCustomer(input: CustomerInput): Promise<any> {
  // Find merchant by publicId
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: input.merchantId }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${input.merchantId} not found`);
  }

  // Generate next customer publicId
  const lastCustomer = await prisma.customer.findFirst({
    orderBy: { publicId: 'desc' },
    select: { publicId: true }
  });
  const nextPublicId = (lastCustomer?.publicId || 0) + 1;

  // Create customer
  const customer = await prisma.customer.create({
    data: {
      publicId: nextPublicId,
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
      isActive: true, // Default to true
      merchantId: merchant.id, // Use CUID
    },
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
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
 * Input: publicId (number), Output: publicId (number)
 */
export async function updateCustomer(
  publicId: number,
  input: CustomerUpdateInput
): Promise<any> {
  // Find customer by publicId
  const existingCustomer = await prisma.customer.findUnique({
    where: { publicId }
  });

  if (!existingCustomer) {
    throw new Error(`Customer with publicId ${publicId} not found`);
  }

  // Update customer
  const updatedCustomer = await prisma.customer.update({
    where: { publicId },
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
          publicId: true,
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
 * Input: publicIds (numbers), Output: publicIds (numbers)
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
    // Find merchant by publicId
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: merchantId },
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
          publicId: true,
          name: true
        }
      }
    },
    orderBy: buildCustomerOrderByClause(sortBy, sortOrder),
    take: limit,
    skip: offset
  });

  // Transform to match CustomerSearchResult type
  const transformedCustomers: CustomerSearchResult[] = customers.map(customer => ({
    id: customer.publicId, // Use publicId (number) as required by CustomerSearchResult
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
    merchantId: customer.merchant.publicId, // Add merchantId as required
    merchant: {
      id: customer.merchant.publicId, // Use publicId (number) as required
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
  // Find merchant by publicId
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${merchantId} not found`);
  }

  return await prisma.customer.findMany({
    where: { merchantId: merchant.id }, // Use CUID
    include: {
      merchant: {
        select: {
          id: true,
          publicId: true,
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
  // Find merchant by publicId
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${merchantId} not found`);
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
  // Find merchant by publicId
  const merchant = await prisma.merchant.findUnique({
    where: { publicId: merchantId },
    select: { id: true }
  });
  
  if (!merchant) {
    throw new Error(`Merchant with publicId ${merchantId} not found`);
  }

  const customer = await prisma.customer.findFirst({
    where: {
      merchantId: merchant.id, // Use CUID
      phone: phone,
    },
  });

  return !!customer;
}
