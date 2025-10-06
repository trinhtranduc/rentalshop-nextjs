// ============================================================================
// AUDIT LOG FUNCTIONS - SIMPLIFIED API
// ============================================================================
// This file contains audit log functions that follow the simplified API pattern

import { prisma } from './client';

// ============================================================================
// AUDIT LOG LOOKUP FUNCTIONS
// ============================================================================

/**
 * Find audit logs with filtering (simplified API)
 */
export const findMany = async (options: any = {}) => {
  const { where = {}, include = {}, orderBy = { createdAt: 'desc' }, take, skip } = options;
  
  return await prisma.auditLog.findMany({
    where,
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      },
      ...include
    },
    orderBy,
    take,
    skip
  });
};

/**
 * Get audit log statistics (simplified API)
 */
export const getStats = async (where: any = {}) => {
  return await prisma.auditLog.count({ where });
};

/**
 * Find first audit log matching criteria (simplified API)
 */
export const findFirst = async (where: any) => {
  return await prisma.auditLog.findFirst({
    where,
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }
    }
  });
};

/**
 * Create audit log (simplified API)
 */
export const create = async (data: any) => {
  return await prisma.auditLog.create({
    data,
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }
    }
  });
};

// ============================================================================
// SIMPLIFIED AUDIT LOGS API
// ============================================================================

export const simplifiedAuditLogs = {
  findMany,
  findFirst,
  create,
  getStats
};
