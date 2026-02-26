// ============================================================================
// CLIENT-SAFE EXPORTS (No server-only dependencies)
// ============================================================================
// These exports are safe for client-side use (Vercel deployments)
// They don't import @rentalshop/database or @rentalshop/utils/server

// Export permissions and types (client-safe)
export * from './permissions';
export { ROLE_PERMISSIONS, CRITICAL_PERMISSIONS } from './permissions';

// Export types (client-safe)
export type { 
  LoginCredentials, 
  RegisterData, 
  AuthUser 
} from './types';

// Export app-specific client auth modules
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

// Export platform access control (simple helpers, client-safe)
export * from './platform-access';

// Export permission helpers (client-safe, no database dependencies)
// Note: These are simple role checks that don't require database access
import type { UserRole } from '@rentalshop/constants';
import type { AuthUser } from './types';

function hasAnyRole(user: Pick<AuthUser, 'role'>, allowed: UserRole[]): boolean {
  return allowed.includes(user.role as UserRole);
}

export function canManageProducts(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
}

// ============================================================================
// SERVER-ONLY EXPORTS
// ============================================================================
// For server-side code (API routes, server components), use:
// import { ... } from '@rentalshop/auth/server'
// 
// This includes:
// - Database operations (loginUser, registerUser, etc.)
// - Server-only utilities (authenticateRequest, getUserScope, etc.)
// - Auth middleware (withAuthRoles, withPermissions, etc.)