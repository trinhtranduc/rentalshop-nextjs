// ============================================================================
// ORDER ITEM FUNCTIONS - SIMPLIFIED API
// ============================================================================
// This file contains order item functions that follow the simplified API pattern

import { prisma } from './client';

// ============================================================================
// ORDER ITEM LOOKUP FUNCTIONS
// ============================================================================

/**
 * Find order items with filtering (simplified API)
 */
export const findMany = async (options: any = {}) => {
  const { where = {}, include = {}, orderBy = { createdAt: 'desc' }, take, skip } = options;
  
  return await prisma.orderItem.findMany({
    where,
    include,
    orderBy,
    take,
    skip
  });
};

/**
 * Group by order items (simplified API)
 */
export const groupBy = async (options: any) => {
  const { by, where = {}, _count = {}, _sum = {}, _avg = {}, orderBy, take } = options;
  
  // Build the groupBy options object
  const groupByOptions: any = {
    by,
    where,
    orderBy,
    take
  };
  
  // Only add aggregation options if they have content
  if (Object.keys(_count).length > 0) {
    groupByOptions._count = _count;
  }
  
  if (Object.keys(_sum).length > 0) {
    groupByOptions._sum = _sum;
  }
  
  if (Object.keys(_avg).length > 0) {
    groupByOptions._avg = _avg;
  }
  
  return await prisma.orderItem.groupBy(groupByOptions);
};

/**
 * Get order item statistics (simplified API)
 */
export const getStats = async (where: any = {}) => {
  return await prisma.orderItem.count({ where });
};

/**
 * Find first order item matching criteria (simplified API)
 */
export const findFirst = async (where: any) => {
  return await prisma.orderItem.findFirst({
    where,
    include: {
      order: true,
      product: true
    }
  });
};

/**
 * Create order item (simplified API)
 */
export const create = async (data: any) => {
  return await prisma.orderItem.create({
    data,
    include: {
      order: true,
      product: true
    }
  });
};

/**
 * Update order item (simplified API)
 */
export const update = async (id: number, data: any) => {
  return await prisma.orderItem.update({
    where: { id },
    data,
    include: {
      order: true,
      product: true
    }
  });
};

/**
 * Delete order item (simplified API)
 */
export const deleteOrderItem = async (id: number) => {
  return await prisma.orderItem.delete({
    where: { id }
  });
};

// ============================================================================
// SIMPLIFIED ORDER ITEMS API
// ============================================================================

export const simplifiedOrderItems = {
  findMany,
  findFirst,
  create,
  update,
  delete: deleteOrderItem,
  getStats,
  groupBy
};
