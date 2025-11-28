/**
 * Query Builder Helper
 * Simplifies common database query patterns (pagination, sorting, filtering)
 */

import { prisma } from './client';

export interface QueryOptions {
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchOptions extends QueryOptions {
  search?: string;
  searchFields?: string[];
}

/**
 * Calculate skip value from page/offset
 */
export function calculateSkip(page?: number, limit: number = 20, offset?: number): number {
  if (offset !== undefined) return offset;
  return ((page || 1) - 1) * limit;
}

/**
 * Build orderBy clause from sort options
 */
export function buildOrderBy(
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc',
  validFields: string[] = ['createdAt']
): any {
  const field = validFields.includes(sortBy || '') ? (sortBy || validFields[0]) : (validFields[0] || 'createdAt');
  return { [field]: sortOrder };
}

/**
 * Build search where clause (case-insensitive contains)
 */
export function buildSearchWhere(
  search?: string,
  searchFields: string[] = ['name']
): any {
  if (!search || !search.trim()) return undefined;

  const searchTerm = search.trim();
  
  if (searchFields.length === 1) {
    return {
      [searchFields[0]]: { contains: searchTerm, mode: 'insensitive' }
    };
  }

  return {
    OR: searchFields.map(field => ({
      [field]: { contains: searchTerm, mode: 'insensitive' }
    }))
  };
}

/**
 * Build exact match where clause (for barcode, etc.)
 */
export function buildExactMatchWhere(field: string, value: any): any {
  if (value === undefined || value === null) return undefined;
  return { [field]: { equals: value } };
}

/**
 * Build range where clause (for numbers, dates)
 */
export function buildRangeWhere(
  field: string,
  min?: number | Date,
  max?: number | Date
): any {
  if (min === undefined && max === undefined) return undefined;
  
  const range: any = {};
  if (min !== undefined) range.gte = min;
  if (max !== undefined) range.lte = max;
  
  return { [field]: range };
}

/**
 * Convert public ID to CUID for a model
 * Helper for dual ID system
 */
export async function convertPublicIdToCuid(
  model: string,
  publicId: number
): Promise<string | null> {
  try {
    const record = await (prisma as any)[model].findUnique({
      where: { id: publicId },
      select: { id: true }
    });
    return record?.id || null;
  } catch (error) {
    console.error(`Error converting public ID to CUID for ${model}:`, error);
    return null;
  }
}

/**
 * Build where clause with merchant isolation (dual ID system)
 */
export async function buildMerchantWhere(
  merchantId?: number,
  where: any = {}
): Promise<any> {
  if (!merchantId) return where;
  
  const merchantCuid = await convertPublicIdToCuid('merchant', merchantId);
  if (merchantCuid) {
    where.merchantId = merchantCuid;
  }
  
  return where;
}

/**
 * Build where clause with outlet filter (dual ID system)
 */
export async function buildOutletWhere(
  outletId?: number,
  where: any = {}
): Promise<any> {
  if (!outletId) return where;
  
  const outletCuid = await convertPublicIdToCuid('outlet', outletId);
  if (outletCuid) {
    where.outletId = outletCuid;
  }
  
  return where;
}

/**
 * Generic search function builder
 * Creates a reusable search function for any model
 */
export function createSearchFunction<T extends { id: any }>(config: {
  model: string;
  validSortFields: string[];
  defaultSortField?: string;
  searchFields?: string[];
  include?: any;
  select?: any;
}) {
  return async (filters: SearchOptions & Record<string, any>) => {
    const {
      page = 1,
      limit = 20,
      offset,
      sortBy,
      sortOrder = 'desc',
      search,
      ...otherFilters
    } = filters;

    const skip = calculateSkip(page, limit, offset);
    const orderBy = buildOrderBy(
      sortBy,
      sortOrder,
      config.validSortFields
    );

    // Build where clause
    const where: any = { ...otherFilters };

    // Add search if provided
    if (search && config.searchFields) {
      const searchWhere = buildSearchWhere(search, config.searchFields);
      if (searchWhere) {
        Object.assign(where, searchWhere);
      }
    }

    // Execute query
    const [data, total] = await Promise.all([
      (prisma as any)[config.model].findMany({
        where,
        ...(config.include ? { include: config.include } : {}),
        ...(config.select ? { select: config.select } : {}),
        orderBy,
        skip,
        take: limit
      }),
      (prisma as any)[config.model].count({ where })
    ]);

    return {
      data,
      total,
      page: offset !== undefined ? Math.floor(offset / limit) + 1 : page,
      limit,
      offset: skip,
      hasMore: skip + limit < total,
      totalPages: Math.ceil(total / limit)
    };
  };
}


