import { prisma } from './client';
import type { 
  CustomerInput, 
  CustomerUpdateInput, 
  CustomerFilters, 
  CustomerSearchFilter,
  CustomerSearchResult,
  CustomerSearchResponse 
} from './types';

/**
 * Search customers with various filters
 */
export const searchCustomers = async (filters: CustomerSearchFilter): Promise<CustomerSearchResponse> => {
  console.log('searchCustomers called with filters:', JSON.stringify(filters, null, 2));
  
  const {
    q,
    merchantId,
    isActive,
    city,
    state,
    country,
    idType,
    limit = 20,
    offset = 0
  } = filters;

  // Build where conditions
  const where: any = {};

  if (merchantId) {
    where.merchantId = merchantId;
  }

  // Default to active customers only (soft delete logic)
  // Only show inactive customers if explicitly requested
  if (isActive !== undefined) {
    where.isActive = isActive;
  } else {
    where.isActive = true; // Default to active customers only
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

  try {
    console.log('Database where clause:', JSON.stringify(where, null, 2));
    
    // Get total count
    const total = await prisma.customer.count({ where });
    console.log('Total customers found:', total);

    // Get customers with pagination
    const customers = await prisma.customer.findMany({
      where,
      include: {
        merchant: {
        select: {
          id: true,
          name: true
        }
      } as any
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    console.log('Customers found:', customers.length);

    const hasMore = offset + limit < total;

    return {
      success: true,
      data: {
        customers: customers as CustomerSearchResult[],
        total,
        limit,
        offset,
        hasMore
      }
    };
  } catch (error) {
    console.error('Database error in searchCustomers:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown database error'}`);
  }
};

/**
 * Get customers by merchant
 */
export const getCustomersByMerchant = async (
  merchantId: string,
  filters: CustomerFilters = {},
  limit = 20,
  offset = 0
): Promise<CustomerSearchResponse> => {
  return searchCustomers({
    merchantId,
    ...filters,
    limit,
    offset
  });
};

/**
 * Get customer by ID (supports both internal ID and public ID)
 */
export const getCustomerById = async (id: string) => {
  // Check if the ID is numeric (public ID) or alphanumeric (internal ID)
  const isPublicId = /^\d+$/.test(id);
  
  if (isPublicId) {
    // Search by public ID
    return prisma.customer.findUnique({
      where: { publicId: parseInt(id) },
      include: {
        merchant: {
          select: {
            id: true,
            name: true
          }
        } as any
      }
    });
  } else {
    // Search by internal ID
    return prisma.customer.findUnique({
      where: { id },
      include: {
        merchant: {
          select: {
            id: true,
            name: true
          }
        } as any
      }
    });
  }
};

/**
 * Create a new customer
 */
export const createCustomer = async (data: CustomerInput) => {
  try {
    // Generate the next public ID for the customer
    const lastCustomer = await prisma.customer.findFirst({
      orderBy: { publicId: 'desc' },
      select: { publicId: true }
    });
    const nextPublicId = (lastCustomer?.publicId || 0) + 1;

    // Validate that the merchant exists
    const merchant = await prisma.merchant.findUnique({
      where: { id: data.merchantId },
      select: { id: true, name: true }
    });

    if (!merchant) {
      throw new Error(`Merchant with ID ${data.merchantId} not found`);
    }

    // Prepare data for Prisma, handling dateOfBirth conversion
    const customerData: any = {
      ...data,
      publicId: nextPublicId,
    };

    // Handle dateOfBirth conversion if it's a string
    if (data.dateOfBirth && typeof data.dateOfBirth === 'string') {
      customerData.dateOfBirth = new Date(data.dateOfBirth);
    }

    // Create the customer
    const customer = await prisma.customer.create({
      data: customerData,
      include: {
        merchant: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return customer;
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

/**
 * Update customer
 */
export const updateCustomer = async (id: string, data: CustomerUpdateInput) => {
  return prisma.customer.update({
    where: { id },
    data,
    include: {
      merchant: {
        select: {
          id: true,
          name: true
        }
      } as any
    }
  });
};

/**
 * Delete customer (hard delete from database)
 */
export const deleteCustomer = async (id: string) => {
  return prisma.customer.delete({
    where: { id }
  });
};

/**
 * Get customers with filtering and pagination
 */
export const getCustomers = async (
  filters: CustomerFilters = {},
  page = 1,
  limit = 20
): Promise<{
  customers: any[];
  total: number;
  page: number;
  totalPages: number;
  hasMore: boolean;
}> => {
  const offset = (page - 1) * limit;

  const where: any = {};

  if (filters.merchantId) {
    where.merchantId = filters.merchantId;
  }

  // Default to active customers only (soft delete logic)
  // Only show inactive customers if explicitly requested
  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  } else {
    where.isActive = true; // Default to active customers only
  }

  if (filters.city) {
    where.city = { contains: filters.city.toLowerCase() };
  }

  if (filters.state) {
    where.state = { contains: filters.state.toLowerCase() };
  }

  if (filters.country) {
    where.country = { contains: filters.country.toLowerCase() };
  }

  if (filters.idType) {
    where.idType = filters.idType;
  }

  if (filters.search && filters.search.trim()) {
    const searchQuery = filters.search.toLowerCase().trim();
    where.OR = [
      { firstName: { contains: searchQuery } },
      { lastName: { contains: searchQuery } },
      { email: { contains: searchQuery } },
      { phone: { contains: searchQuery } }
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        merchant: {
        select: {
          id: true,
          name: true
        }
      } as any
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.customer.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);
  const hasMore = page < totalPages;

  return {
    customers,
    total,
    page,
    totalPages,
    hasMore
  };
}; 