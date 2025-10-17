// ============================================================================
// CATEGORY FUNCTIONS - SIMPLIFIED API
// ============================================================================
// This file contains category functions that follow the simplified API pattern
// - Input: id (number)
// - Database: queries by id, uses numbers for relationships
// - Return: includes id (number)

import { prisma } from './client';

// ============================================================================
// CATEGORY LOOKUP FUNCTIONS
// ============================================================================

/**
 * Find category by ID (simplified API)
 */
export const findById = async (id: number) => {
  return await prisma.category.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true
    }
  });
};

/**
 * Find first category matching criteria (simplified API)
 */
export const findFirst = async (where: any) => {
  return await prisma.category.findFirst({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true
    }
  });
};

/**
 * Find many categories matching criteria (simplified API)
 */
export const findMany = async (options: any = {}) => {
  const { where = {}, select = {}, orderBy = { name: 'asc' }, take, skip } = options;
  
  return await prisma.category.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
      ...select
    },
    orderBy,
    take,
    skip
  });
};

/**
 * Create new category (simplified API)
 */
export const create = async (data: any) => {
  return await prisma.category.create({
    data,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true
    }
  });
};

/**
 * Update category (simplified API)
 */
export const update = async (id: number, data: any) => {
  return await prisma.category.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true
    }
  });
};

/**
 * Delete category (soft delete) (simplified API)
 */
export const deleteCategory = async (id: number) => {
  return await prisma.category.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true
    }
  });
};

/**
 * Search categories with pagination (simplified API)
 */
export const search = async (filters: any) => {
  const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc', ...whereFilters } = filters;
  const skip = (page - 1) * limit;

  console.log('🔍 DB category.search - Received filters:', filters);

  // Build where clause
  const where: any = {};
  
  if (whereFilters.merchantId) where.merchantId = whereFilters.merchantId;
  if (whereFilters.isActive !== undefined) where.isActive = whereFilters.isActive;
  
  // Text search by category name - accept both 'q' and 'search' parameters
  const searchTerm = (whereFilters.q || whereFilters.search)?.trim();
  console.log('🔍 DB category.search - searchTerm:', searchTerm, 'length:', searchTerm?.length);
  
  if (searchTerm && searchTerm.length > 0) {
    where.name = { 
      contains: searchTerm, 
      mode: 'insensitive' 
    };
    console.log('✅ DB category.search - Added name filter:', where.name);
  } else {
    console.log('⚠️ DB category.search - No search term, will return all categories');
  }
  
  console.log('🔍 DB category.search - Final where clause:', JSON.stringify(where, null, 2));

  // Build orderBy based on sortBy and sortOrder
  const orderBy: any = {};
  if (sortBy === 'name' || sortBy === 'createdAt' || sortBy === 'updatedAt') {
    orderBy[sortBy] = sortOrder;
  } else {
    orderBy.name = 'asc'; // Default
  }

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy,
      skip,
      take: limit
    }),
    prisma.category.count({ where })
  ]);

  console.log(`📊 db.categories.search: page=${page}, skip=${skip}, limit=${limit}, total=${total}, categories=${categories.length}`);

  return {
    data: categories,
    total,
    page,
    limit,
    hasMore: skip + limit < total,
    totalPages: Math.ceil(total / limit)
  };
};

/**
 * Get category statistics (simplified API)
 */
export const getStats = async (whereClause?: any) => {
  // Handle both direct where clause and object with where property
  const where = whereClause?.where || whereClause || {};
  return await prisma.category.count({ where });
};

// ============================================================================
// SIMPLIFIED CATEGORY API
// ============================================================================

export const simplifiedCategories = {
  findById,
  findFirst,
  findMany,
  create,
  update,
  delete: deleteCategory,
  search,
  getStats
};
