// ============================================================================
// CONSOLIDATED MIDDLEWARE - CLEAN, SINGLE PURPOSE
// ============================================================================
// This file provides clean middleware functions that use the core auth functions
// No duplication, single source of truth

import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateRequest,
  getUserScope,
  hasPermissionSync,
  canAccessResourceSync,
  validateScope,
  Permission,
  Resource,
  UserScope,
  AuthorizedRequest,
  createAuthError,
  createScopeError,
  createPermissionError
} from './core';

// ============================================================================
// MIDDLEWARE TYPES
// ============================================================================

export interface AuthorizationOptions {
  permission?: Permission;
  resource?: Resource;
  action?: 'view' | 'manage';
  scope?: { merchantId?: number; outletId?: number };
  requireActiveSubscription?: boolean;
}

// ============================================================================
// BASIC AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Higher-order function that wraps API route handlers with authentication only
 * Use this when you only need authentication, not authorization
 */
export function withAuth<T = any>(
  handler: (request: NextRequest, user: any, ...args: any[]) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse<T>> => {
    const authResult = await authenticateRequest(request);
    
    if (!authResult.success) {
      return authResult.response as NextResponse<T>;
    }

    return handler(request, authResult.user, ...args);
  };
}

/**
 * Optional authentication middleware
 * Returns user if token is valid, but doesn't fail if no token provided
 */
export async function optionalAuth(request: NextRequest): Promise<any | null> {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    const authResult = await authenticateRequest(request);
    return authResult.success ? authResult.user : null;
  } catch (error) {
    console.error('Optional authentication error:', error);
    return null;
  }
}

// ============================================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================================

/**
 * Comprehensive authorization check for API routes
 * Combines authentication, permission checking, and scope validation
 */
export function authorizeRequest(
  user: any,
  options: AuthorizationOptions = {}
): { 
  authorized: boolean; 
  error?: NextResponse;
  userScope: UserScope;
} {
  const userScope = getUserScope(user);
  
  // Check permission if specified (using sync version for backward compatibility)
  // Note: For custom permissions support, use async versions in route handlers
  if (options.permission && !hasPermissionSync(user, options.permission)) {
    return {
      authorized: false,
      error: createPermissionError(options.permission),
      userScope
    };
  }
  
  // Check resource access if specified (using sync version for backward compatibility)
  if (options.resource && !canAccessResourceSync(user, options.resource, options.action || 'view')) {
    return {
      authorized: false,
      error: createPermissionError(`${options.resource}.${options.action || 'view'}`),
      userScope
    };
  }
  
  // Check scope if specified
  if (options.scope) {
    const scopeCheck = validateScope(userScope, options.scope);
    if (!scopeCheck.valid) {
      return {
        authorized: false,
        error: scopeCheck.error,
        userScope
      };
    }
  }
  
  return { authorized: true, userScope };
}

/**
 * Higher-order function for API route handlers with authorization
 * This provides the cleanest API for route handlers
 */
export function withAuthAndAuthz<T = any>(
  options: AuthorizationOptions = {},
  handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse<T>> => {
    // Authenticate
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response as NextResponse<T>;
    }

    // Authorize
    const authzResult = authorizeRequest(authResult.user, options);
    if (!authzResult.authorized) {
      return authzResult.error! as NextResponse<T>;
    }

    // Call handler with authorized request
    const authorizedRequest: AuthorizedRequest = {
      request,
      user: authResult.user,
      userScope: authzResult.userScope
    };

    return handler(authorizedRequest, ...args);
  };
}

// ============================================================================
// CONVENIENCE MIDDLEWARE FUNCTIONS
// ============================================================================
// Note: Deprecated convenience functions (withAdminAuth, etc.) are exported from unified-auth.ts
// This file only exports utility functions, not auth wrappers

/**
 * User management middleware
 */
export const withUserManagementAuth = withAuthAndAuthz.bind(null, { permission: 'users.manage' });

/**
 * Product management middleware
 */
export const withProductManagementAuth = withAuthAndAuthz.bind(null, { permission: 'products.manage' });

/**
 * Product export middleware (only ADMIN, MERCHANT, OUTLET_ADMIN)
 */
export const withProductExportAuth = withAuthAndAuthz.bind(null, { permission: 'products.export' });

/**
 * Order management middleware (full CRUD)
 */
export const withOrderManagementAuth = withAuthAndAuthz.bind(null, { permission: 'orders.manage' });

/**
 * Order creation middleware
 */
export const withOrderCreateAuth = withAuthAndAuthz.bind(null, { permission: 'orders.create' });

/**
 * Order view middleware
 */
export const withOrderViewAuth = withAuthAndAuthz.bind(null, { permission: 'orders.view' });

/**
 * Order update middleware
 */
export const withOrderUpdateAuth = withAuthAndAuthz.bind(null, { permission: 'orders.update' });

/**
 * Order delete middleware (only ADMIN, MERCHANT, OUTLET_ADMIN)
 */
export const withOrderDeleteAuth = withAuthAndAuthz.bind(null, { permission: 'orders.delete' });

/**
 * Order export middleware (only ADMIN, MERCHANT, OUTLET_ADMIN)
 */
export const withOrderExportAuth = withAuthAndAuthz.bind(null, { permission: 'orders.export' });

/**
 * Customer management middleware
 */
export const withCustomerManagementAuth = withAuthAndAuthz.bind(null, { permission: 'customers.manage' });

/**
 * Customer export middleware (only ADMIN, MERCHANT, OUTLET_ADMIN)
 */
export const withCustomerExportAuth = withAuthAndAuthz.bind(null, { permission: 'customers.export' });

/**
 * Billing management middleware
 */
export const withBillingManagementAuth = withAuthAndAuthz.bind(null, { permission: 'billing.manage' });

/**
 * View-only middleware (for read operations)
 */
export const withViewAuth = withAuthAndAuthz.bind(null, { action: 'view' });

// ============================================================================
// SCOPE-SPECIFIC MIDDLEWARE
// ============================================================================

/**
 * Middleware that requires specific merchant scope
 */
export function withMerchantScope(merchantId: number) {
  return withAuthAndAuthz.bind(null, { 
    scope: { merchantId },
    resource: 'merchant',
    action: 'view'
  });
}

/**
 * Middleware that requires specific outlet scope
 */
export function withOutletScope(outletId: number) {
  return withAuthAndAuthz.bind(null, { 
    scope: { outletId },
    resource: 'outlet',
    action: 'view'
  });
}

// ============================================================================
// UTILITY FUNCTIONS FOR ROUTE HANDLERS
// ============================================================================

/**
 * Extract user scope from authorized request
 * This is the SECURITY-CRITICAL function for database operations
 */
export function getUserScopeFromRequest(authorizedRequest: AuthorizedRequest): UserScope {
  return authorizedRequest.userScope;
}

/**
 * Build secure database where clause from user scope
 * This ensures data isolation at the database level
 */
export function buildSecureWhereClause(
  authorizedRequest: AuthorizedRequest,
  additionalWhere: any = {}
): any {
  const { userScope } = authorizedRequest;
  
  // System admins can access everything (no additional restrictions)
  if (userScope.canAccessSystem) {
    return additionalWhere;
  }
  
  const where = { ...additionalWhere };
  
  // Apply merchant isolation
  if (userScope.merchantId) {
    where.merchantId = userScope.merchantId;
  }
  
  // Apply outlet isolation
  if (userScope.outletId) {
    where.outletId = userScope.outletId;
  }
  
  return where;
}

/**
 * Validate that a resource belongs to the user's scope
 * This should be called before performing operations on specific resources
 */
export async function validateResourceBelongsToUser(
  authorizedRequest: AuthorizedRequest,
  resourceType: 'merchant' | 'outlet' | 'product' | 'order' | 'customer',
  resourceId: number
): Promise<{ valid: boolean; error?: NextResponse }> {
  const { userScope } = authorizedRequest;
  
  // System admins can access everything
  if (userScope.canAccessSystem) {
    return { valid: true };
  }
  
  // For now, return valid - in a real implementation, you would:
  // 1. Query the database to get the resource
  // 2. Check if it belongs to the user's merchant/outlet
  // 3. Return validation result
  
  // This is a placeholder - implement based on your specific needs
  return { valid: true };
}
