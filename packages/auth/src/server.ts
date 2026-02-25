/**
 * Server-only auth exports
 * 
 * This file exports auth utilities that should only be used on the server-side
 * (API routes, server components, etc.) and cannot be used in client-side code.
 * 
 * These utilities use Node.js modules that are not available in the browser:
 * - @rentalshop/database (Prisma Client)
 * - @rentalshop/utils/server (file system, etc.)
 */

// Server-only auth functions (use database)
export * from './auth';
export * from './password';
export * from './jwt';

// Server-only core functions (use database and utils/server)
export * from './core';

// Server-only unified auth wrappers
export * from './unified-auth';

// Server-only middleware utilities
export {
  authorizeRequest,
  withAuthAndAuthz,
  withMerchantScope,
  withOutletScope,
  getUserScopeFromRequest,
  buildSecureWhereClause,
  validateResourceBelongsToUser,
  withCustomerExportAuth
} from './middleware';

// Re-export specific server-only functions for backward compatibility
export { 
  authenticateRequest,
  getUserScope,
  hasPermission,
  hasPermissionSync,
  canAccessResource,
  canAccessResourceSync,
  getUserPermissions,
  createAuthError,
  createScopeError,
  createPermissionError,
  canCreateOrders,
  canViewOrders,
  canUpdateOrders,
  canDeleteOrders,
  canManageOrders,
  canExportOrders,
  canExportProducts,
  canExportCustomers,
  assertAnyRole,
  hasAnyRole,
  validateMerchantOutletAccess,
  validateScope,
  validateMerchantAccess,
  validateMerchantOutletRoute
} from './core';

export type {
  MerchantOutletAuthOptions,
  MerchantOutletAuthResult,
  ValidateMerchantAccessResult
} from './core';

// Export specific JWT functions (server-only)
export { verifyTokenSimple, generateToken, verifyToken } from './jwt';
