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
      createdAt: true,
      updatedAt: true
    }
  });
};

/**
 * Get category statistics (simplified API)
 */
export const getStats = async (where: any = {}) => {
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
  getStats
};
