// ============================================================================
// DATABASE UTILITIES - SIMPLIFIED
// ============================================================================

import { prisma } from './client';

// ============================================================================
// CORE UTILITIES
// ============================================================================

/**
 * Check database connection health
 */
export const checkDatabaseConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'connected' };
  } catch (error) {
    return { status: 'disconnected', error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
