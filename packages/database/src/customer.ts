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

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (city) {
    where.city = { contains: city, mode: 'insensitive' };
  }

  if (state) {
    where.state = { contains: state, mode: 'insensitive' };
  }

  if (country) {
    where.country = { contains: country, mode: 'insensitive' };
  }

  if (idType) {
    where.idType = idType;
  }

  // Search query for name, email, phone, or idNumber
  if (q) {
    where.OR = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { idNumber: { contains: q, mode: 'insensitive' } }
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
          companyName: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  });

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
 * Get customer by ID
 */
export const getCustomerById = async (id: string) => {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      merchant: {
        select: {
          id: true,
          companyName: true
        }
      }
    }
  });
};

/**
 * Create a new customer
 */
export const createCustomer = async (data: CustomerInput) => {
  return prisma.customer.create({
    data,
    include: {
      merchant: {
        select: {
          id: true,
          companyName: true
        }
      }
    }
  });
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
          companyName: true
        }
      }
    }
  });
};

/**
 * Delete customer (soft delete by setting isActive to false)
 */
export const deleteCustomer = async (id: string) => {
  return prisma.customer.update({
    where: { id },
    data: { isActive: false },
    include: {
      merchant: {
        select: {
          id: true,
          companyName: true
        }
      }
    }
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

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.city) {
    where.city = { contains: filters.city, mode: 'insensitive' };
  }

  if (filters.state) {
    where.state = { contains: filters.state, mode: 'insensitive' };
  }

  if (filters.country) {
    where.country = { contains: filters.country, mode: 'insensitive' };
  }

  if (filters.idType) {
    where.idType = filters.idType;
  }

  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { phone: { contains: filters.search, mode: 'insensitive' } },
      { idNumber: { contains: filters.search, mode: 'insensitive' } }
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        merchant: {
          select: {
            id: true,
            companyName: true
          }
        }
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