// Export core auth utilities
export * from './auth';
export * from './password';
export * from './jwt';

// Export consolidated authorization system (single source of truth)
export * from './core';
export * from './middleware';

// Re-export specific functions for backward compatibility
export { 
  authenticateRequest,
  getUserScope,
  hasPermission,
  canAccessResource,
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
  hasAnyRole
} from './core';

export {
  withAuth,
  withAuthAndAuthz,
  withAdminAuth,
  withUserManagementAuth,
  withProductManagementAuth,
  withOrderManagementAuth,
  withOrderCreateAuth,
  withOrderViewAuth,
  withOrderUpdateAuth,
  withOrderDeleteAuth,
  withOrderExportAuth,
  withProductExportAuth,
  withCustomerExportAuth,
  withCustomerManagementAuth,
  withBillingManagementAuth,
  withViewAuth,
  withMerchantScope,
  withOutletScope,
  buildSecureWhereClause,
  validateResourceBelongsToUser
} from './middleware';

// Export specific JWT functions
export { verifyTokenSimple, generateToken, verifyToken } from './jwt';

// Export types (but exclude AuthResponse to avoid conflicts)
export type { 
  LoginCredentials, 
  RegisterData, 
  AuthUser 
} from './types';

// Export app-specific auth modules (with specific exports to avoid conflicts)
export { 
  isAuthenticated as isAuthenticatedClient,
  isAuthenticatedWithVerification as isAuthenticatedWithVerificationClient,
  verifyTokenWithServer as verifyTokenWithServerClient,
  loginUserClient,
  logoutUserClient,
  getCurrentUserClient
} from './client';

export type { AuthResponse } from './client';

export { 
  isAuthenticated as isAuthenticatedAdmin,
  isAuthenticatedWithVerification as isAuthenticatedWithVerificationAdmin,
  verifyTokenWithServer as verifyTokenWithServerAdmin
} from './admin';