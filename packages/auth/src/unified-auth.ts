// ============================================================================
// UNIFIED AUTH WRAPPER - STANDARDIZED PATTERN
// ============================================================================
// This replaces all the scattered auth middleware with one consistent pattern
// Goal: Replace 14+ auth wrappers with 1 unified approach

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, getUserScope, hasAnyRole, hasAnyPermission, getUserPermissions, type Permission } from './core';
import { USER_ROLE, type UserRole } from '@rentalshop/constants';
import { SubscriptionStatusChecker } from './subscription-checker';

// ============================================================================
// TYPES
// ============================================================================

// Re-export UserRole from constants for convenience
export type { UserRole } from '@rentalshop/constants';

export interface AuthContext {
  user: any;
  userScope: any;
}

export interface AuthOptions {
  /** Allowed roles for this route */
  roles?: UserRole[];
  /** Require active subscription (default: true for non-ADMIN users) */
  requireActiveSubscription?: boolean;
}

export type AuthenticatedHandler = (
  request: NextRequest,
  context: AuthContext
) => Promise<NextResponse>;

// Higher-order function type
export type AuthWrapper = (handler: AuthenticatedHandler) => (request: NextRequest) => Promise<NextResponse>;

// ============================================================================
// SUBSCRIPTION CHECK HELPER
// ============================================================================

/**
 * Check if merchant has active subscription
 * ADMIN users bypass this check
 * Uses SubscriptionStatusChecker for simplified logic
 */
async function checkSubscriptionStatus(user: any): Promise<{ success: boolean; response?: NextResponse }> {
  return SubscriptionStatusChecker.check(user);
}

// ============================================================================
// UNIFIED AUTH WRAPPER
// ============================================================================

/**
 * Unified authentication wrapper for all API routes
 * Replaces withUserManagementAuth, withOrderViewAuth, withProductManagementAuth, etc.
 * 
 * Usage:
 * // With role check and subscription check (default)
 * export const POST = withAuthRoles(['ADMIN', 'MERCHANT'])(async (req, { user }) => {
 *   // Your route logic here
 * });
 * 
 * // Without subscription check (for read-only operations)
 * export const GET = withAuthRoles(['ADMIN', 'MERCHANT'], { requireActiveSubscription: false })(async (req, { user }) => {
 *   // Read-only operation
 * });
 * 
 * // Any authenticated user
 * export const GET = withAuthRoles()(async (req, { user }) => {
 *   // Any authenticated user can access
 * });
 */
export function withAuthRoles(allowedRoles?: UserRole[], options?: { requireActiveSubscription?: boolean }): AuthWrapper {
  const requireSubscription = options?.requireActiveSubscription !== false; // Default to true
  return function (handler: AuthenticatedHandler) {
    return async function (request: NextRequest): Promise<NextResponse> {
      const url = new URL(request.url);
      const pathname = url.pathname;
      console.log(`🔐 [AUTH] Auth check for ${request.method} ${pathname}`);
      
      // Log Authorization header (first 20 chars only)
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        const tokenPreview = authHeader.substring(0, 30) + '...';
        console.log(`🔐 [AUTH] Authorization header present: ${tokenPreview}`);
      } else {
        console.log(`🔐 [AUTH] No Authorization header found`);
      }
      
      try {
        // Step 1: Authenticate request
        const authResult = await authenticateRequest(request);
        if (!authResult.success) {
          console.log('❌ [AUTH] Authentication failed - returning 401');
          // Try to log error details if available
          try {
            const clonedResponse = authResult.response.clone();
            const responseBody = await clonedResponse.json().catch(() => ({}));
            console.log('❌ [AUTH] Error response:', responseBody);
          } catch (e) {
            console.log('❌ [AUTH] Could not parse error response');
          }
          return authResult.response;
        }

        const user = authResult.user;
        console.log(`✅ [AUTH] User authenticated: ${user.email} (${user.role})`);

        // Step 2: Check role permissions if specified
        if (allowedRoles && allowedRoles.length > 0) {
          if (!hasAnyRole(user, allowedRoles)) {
            console.log(`❌ [AUTH] Insufficient permissions: ${user.role} not in [${allowedRoles.join(', ')}]`);
            return NextResponse.json(
              { 
                success: false,
                code: 'INSUFFICIENT_PERMISSIONS',
                message: 'Insufficient permissions',
                required: allowedRoles,
                current: user.role
              }, 
              { status: 403 }
            );
          }
          console.log(`✅ [AUTH] Role authorized: ${user.role}`);
        }

        // Step 3: Check subscription status if required
        if (requireSubscription) {
          console.log('🔍 Checking subscription status...');
          const subscriptionCheck = await checkSubscriptionStatus(user);
          if (!subscriptionCheck.success && subscriptionCheck.response) {
            console.log('❌ Subscription check failed');
            return subscriptionCheck.response;
          }
          console.log('✅ Subscription is active');
        }

        // Step 4: Get user scope for context
        const userScope = getUserScope(user);

        // Step 5: Call the handler with authenticated context
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
 * Admin-only routes (System-wide access)
 * @deprecated Use `withPermissions(['system.manage'])` or specific permission instead.
 * This function is kept for backward compatibility but will be removed in a future version.
 * 
 * Example:
 * ```typescript
 * // Instead of: withAdminAuth
 * // Use: withPermissions(['system.manage'])
 * export const GET = withPermissions(['system.manage'])(async (request, { user, userScope }) => {
 * ```
 */
export const withAdminAuth = withAuthRoles(['ADMIN']);

/**
 * Admin and Merchant routes (Organization-level access)
 * @deprecated Use `withPermissions(['merchant.view'])` or specific permission instead.
 * This function is kept for backward compatibility but will be removed in a future version.
 * 
 * Example:
 * ```typescript
 * // Instead of: withMerchantAuth
 * // Use: withPermissions(['merchant.view'])
 * export const GET = withPermissions(['merchant.view'])(async (request, { user, userScope }) => {
 * ```
 */
export const withMerchantAuth = withAuthRoles(['ADMIN', 'MERCHANT']);

/**
 * All management roles (Admin, Merchant, Outlet Admin - excluding Outlet Staff)
 * @deprecated Use `withPermissions(['products.manage'])` or specific permission instead.
 * This function is kept for backward compatibility but will be removed in a future version.
 * 
 * Example:
 * ```typescript
 * // Instead of: withManagementAuth
 * // Use: withPermissions(['products.manage']) for product management
 * // Or: withPermissions(['orders.manage']) for order management
 * export const POST = withPermissions(['products.manage'])(async (request, { user, userScope }) => {
 * ```
 */
export const withManagementAuth = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);

/**
 * Outlet-level access (Outlet Admin + Outlet Staff)
 * @deprecated Use `withPermissions(['outlet.view'])` or specific permission instead.
 * This function is kept for backward compatibility but will be removed in a future version.
 * 
 * Example:
 * ```typescript
 * // Instead of: withOutletAuth
 * // Use: withPermissions(['outlet.view'])
 * export const GET = withPermissions(['outlet.view'])(async (request, { user, userScope }) => {
 * ```
 */
export const withOutletAuth = withAuthRoles(['OUTLET_ADMIN', 'OUTLET_STAFF']);

/**
 * Any authenticated user (No role restrictions)
 */
export const withAnyAuth = withAuthRoles();

/**
 * Read-only access (No subscription required)
 */
export const withReadOnlyAuth = withAuthRoles(undefined, { requireActiveSubscription: false });

/**
 * Admin + Read-only for non-admin users
 */
export const withAdminOrReadOnlyAuth = withAuthRoles(['ADMIN'], { requireActiveSubscription: false });

// ============================================================================
// PERMISSION-BASED AUTH (RECOMMENDED - DRY APPROACH)
// ============================================================================

/**
 * ✅ RECOMMENDED: Check permissions from ROLE_PERMISSIONS instead of hardcoding roles
 * 
 * This approach is DRY and maintainable:
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 * - Automatically reads permissions from user's role in ROLE_PERMISSIONS
 * - When you change permissions in ROLE_PERMISSIONS, all endpoints automatically update
 * - No need to update multiple endpoints when permissions change
 * 
 * How it works:
 * 1. User has a role (e.g., OUTLET_STAFF)
 * 2. Function checks ROLE_PERMISSIONS[user.role] for required permission
 * 3. If permission exists in role's permissions → access granted
 * 4. If permission doesn't exist → access denied (403)
 * 
 * Example: OUTLET_STAFF permissions change
 * - Before: ROLE_PERMISSIONS['OUTLET_STAFF'] = ['products.manage', 'products.view']
 *   → withPermissions(['products.manage']) allows OUTLET_STAFF ✅
 * - After: ROLE_PERMISSIONS['OUTLET_STAFF'] = ['products.view'] (removed products.manage)
 *   → withPermissions(['products.manage']) denies OUTLET_STAFF ❌
 *   → withPermissions(['products.view']) still allows OUTLET_STAFF ✅
 * - No code changes needed in endpoints! Just update ROLE_PERMISSIONS.
 * 
 * Usage:
 * ```typescript
 * // Instead of: withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])
 * // Use: withPermissions(['products.view'])
 * // This automatically includes all roles that have 'products.view' in ROLE_PERMISSIONS
 * export const GET = withPermissions(['products.view'])(async (request, { user, userScope }) => {
 *   // All roles with 'products.view' permission can access
 *   // Currently: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 *   // If you remove 'products.view' from OUTLET_STAFF in ROLE_PERMISSIONS,
 *   // this endpoint will automatically deny OUTLET_STAFF without code changes
 * });
 * 
 * // Multiple permissions (OR logic - user needs ANY of these)
 * export const POST = withPermissions(['products.manage', 'products.create'])(async (request, { user, userScope }) => {
 *   // User needs either 'products.manage' OR 'products.create'
 *   // Checks ROLE_PERMISSIONS[user.role] for both permissions
 * });
 * ```
 */
export function withPermissions(
  requiredPermissions: Permission[],
  options?: { requireActiveSubscription?: boolean }
): AuthWrapper {
  const requireSubscription = options?.requireActiveSubscription !== false; // Default to true
  
  return function (handler: AuthenticatedHandler) {
    return async function (request: NextRequest): Promise<NextResponse> {
      const url = new URL(request.url);
      const pathname = url.pathname;
      console.log(`🔐 [AUTH] Permission check for ${request.method} ${pathname}`);
      console.log(`🔐 [AUTH] Required permissions: ${requiredPermissions.join(', ')}`);
      
      try {
        // Step 1: Authenticate request
        const authResult = await authenticateRequest(request);
        if (!authResult.success) {
          console.log('❌ [AUTH] Authentication failed - returning 401');
          return authResult.response;
        }

        const user = authResult.user;
        console.log(`✅ [AUTH] User authenticated: ${user.email} (${user.role})`);

        // Step 2: Check permissions (supports custom merchant permissions)
        const hasPermission = await hasAnyPermission(user, requiredPermissions);
        if (!hasPermission) {
          const { getUserPermissions } = await import('./core');
          const userPermissions = await getUserPermissions(user);
          console.log(`❌ [AUTH] Insufficient permissions: User ${user.role} does not have any of [${requiredPermissions.join(', ')}]`);
          console.log(`❌ [AUTH] User's permissions: [${userPermissions.join(', ')}]`);
          
          return NextResponse.json(
            { 
              success: false,
              code: 'INSUFFICIENT_PERMISSIONS',
              message: 'Insufficient permissions',
              required: requiredPermissions,
              current: user.role,
              userPermissions: userPermissions
            }, 
            { status: 403 }
          );
        }
        console.log(`✅ [AUTH] Permission authorized: User has required permission(s)`);

        // Step 3: Check subscription status if required
        if (requireSubscription) {
          console.log('🔍 Checking subscription status...');
          const subscriptionCheck = await checkSubscriptionStatus(user);
          if (!subscriptionCheck.success && subscriptionCheck.response) {
            console.log('❌ Subscription check failed');
            return subscriptionCheck.response;
          }
          console.log('✅ Subscription is active');
        }

        // Step 4: Get user scope for context
        const userScope = getUserScope(user);

        // Step 5: Call the handler with authenticated context
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