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
  if (q) {
    const searchQuery = q.toLowerCase();
    where.OR = [
      { firstName: { contains: searchQuery } },
      { lastName: { contains: searchQuery } },
      { email: { contains: searchQuery } },
      { phone: { contains: searchQuery } },
      { idNumber: { contains: searchQuery } }
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

  if (filters.search) {
    const searchQuery = filters.search.toLowerCase();
    where.OR = [
      { firstName: { contains: searchQuery } },
      { lastName: { contains: searchQuery } },
      { email: { contains: searchQuery } },
      { phone: { contains: searchQuery } },
      { idNumber: { contains: searchQuery } }
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