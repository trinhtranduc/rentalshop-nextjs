// ============================================================================
// UNIFIED AUTH WRAPPER - STANDARDIZED PATTERN
// ============================================================================
// This replaces all the scattered auth middleware with one consistent pattern
// Goal: Replace 14+ auth wrappers with 1 unified approach

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getUserScope, hasAnyRole } from './core';

// ============================================================================
// TYPES
// ============================================================================

export type UserRole = 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';

export interface AuthContext {
  user: any;
  userScope: any;
}

export type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthContext
) => Promise<NextResponse>;

// Higher-order function type
export type AuthWrapper = (handler: AuthenticatedHandler) => (request: NextRequest) => Promise<NextResponse>;

// ============================================================================
// UNIFIED AUTH WRAPPER
// ============================================================================

/**
 * Unified authentication wrapper for all API routes
 * Replaces withUserManagementAuth, withOrderViewAuth, withProductManagementAuth, etc.
 * 
 * Usage:
 * export const GET = withAuthRoles(['ADMIN', 'MERCHANT'])(async (req, { user }) => {
 *   // Your route logic here
 * });
 * 
 * export const POST = withAuthRoles()(async (req, { user }) => {
 *   // Any authenticated user can access
 * });
 */
export function withAuthRoles(allowedRoles?: UserRole[]): AuthWrapper {
  return function (handler: AuthenticatedHandler) {
    return async function (request: NextRequest): Promise<NextResponse> {
      console.log(`🔐 Auth check for ${request.method} ${request.url}`);
      
      try {
        // Step 1: Authenticate request
        const authResult = await authenticateRequest(request);
        if (!authResult.success) {
          console.log('❌ Authentication failed');
          return authResult.response;
        }

        const user = authResult.user;
        console.log(`✅ User authenticated: ${user.email} (${user.role})`);

        // Step 2: Check role permissions if specified
        if (allowedRoles && allowedRoles.length > 0) {
          if (!hasAnyRole(user, allowedRoles)) {
            console.log(`❌ Insufficient permissions: ${user.role} not in [${allowedRoles.join(', ')}]`);
            return NextResponse.json(
              { 
                error: 'Insufficient permissions',
                required: allowedRoles,
                current: user.role
              }, 
              { status: 403 }
            );
          }
          console.log(`✅ Role authorized: ${user.role}`);
        }

        // Step 3: Get user scope for context
        const userScope = getUserScope(user);

        // Step 4: Call the handler with authenticated context
        const context: AuthContext = { user, userScope };
        return await handler(request, context);

      } catch (error) {
        console.error('🚨 Auth wrapper error:', error);
        return NextResponse.json(
          { error: 'Authentication error' },
          { status: 500 }
        );
      }
    };
  };
}

// ============================================================================
// CONVENIENCE EXPORTS (for common patterns)
// ============================================================================

/**
 * Admin-only routes  
 */
export const withAdminAuth = withAuthRoles(['ADMIN']);

/**
 * Admin and Merchant routes
 */
export const withMerchantAuth = withAuthRoles(['ADMIN', 'MERCHANT']);

/**
 * All management roles (excluding OUTLET_STAFF)
 */
export const withManagementAuth = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);

/**
 * Any authenticated user
 */
export const withAnyAuth = withAuthRoles();

// ============================================================================
// MAIN EXPORT - Use this in API routes
// ============================================================================

/**
 * Main unified auth function - replaces all other auth wrappers
 * Use this instead of withUserManagementAuth, withOrderViewAuth, etc.
 */
export const withAuth = withAuthRoles;

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Temporary aliases for backward compatibility during migration
 * TODO: Remove these after all routes are migrated
 */
export const withUserManagementAuth = withManagementAuth;
export const withProductManagementAuth = withManagementAuth;
export const withOrderManagementAuth = withManagementAuth;
export const withOrderViewAuth = withAnyAuth;
export const withOrderCreateAuth = withManagementAuth;
export const withProductExportAuth = withManagementAuth;
export const withCustomerManagementAuth = withManagementAuth;