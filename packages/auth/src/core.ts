// ============================================================================
// CORE AUTHENTICATION & AUTHORIZATION - SINGLE SOURCE OF TRUTH
// ============================================================================
// This file contains the core, non-duplicated authentication and authorization logic
// All other files should import from here to maintain consistency

import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from './jwt';
import { AuthUser } from './types';
import { PlanLimitError } from '@rentalshop/utils';
import { API, USER_ROLE, type UserRole } from '@rentalshop/constants';
import { db } from '@rentalshop/database';
import { SUBSCRIPTION_STATUS } from '@rentalshop/constants';

// ============================================================================
// SUBSCRIPTION STATUS CHECK HELPER
// ============================================================================

/**
 * Check if merchant has active subscription
 * Returns error response if subscription is paused, cancelled, or expired
 */
async function checkMerchantSubscriptionStatus(merchantId: number): Promise<{
  success: boolean;
  response?: NextResponse;
}> {
  try {
    // Get merchant with subscription info
    const merchant = await db.merchants.findById(merchantId);
    
    if (!merchant) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            success: false, 
            message: 'Merchant not found', 
            code: 'MERCHANT_NOT_FOUND' 
          },
          { status: 404 }
        )
      };
    }

    // Get subscription object
    const subscription = merchant.subscription;
    
    if (!subscription) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            success: false, 
            message: 'No active subscription found. Please subscribe to continue.',
            code: 'NO_SUBSCRIPTION',
            details: {
              merchantId: merchant.id,
              merchantName: merchant.name
            }
          },
          { status: 403 }
        )
      };
    }

    const subscriptionStatus = subscription.status;

    // Block if subscription is PAUSED
    if (subscriptionStatus === SUBSCRIPTION_STATUS.PAUSED) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            success: false, 
            message: 'Your subscription is paused. Please contact support to reactivate.',
            code: 'SUBSCRIPTION_PAUSED',
            details: {
              status: subscriptionStatus,
              merchantId: merchant.id,
              merchantName: merchant.name
            }
          },
          { status: 403 }
        )
      };
    }

    // Block if subscription is CANCELLED
    if (subscriptionStatus === SUBSCRIPTION_STATUS.CANCELLED) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            success: false, 
            message: 'Your subscription has been cancelled. Please contact support to reactivate.',
            code: 'SUBSCRIPTION_CANCELLED',
            details: {
              status: subscriptionStatus,
              merchantId: merchant.id,
              merchantName: merchant.name,
              canceledAt: subscription.canceledAt
            }
          },
          { status: 403 }
        )
      };
    }

    // Block if subscription is EXPIRED
    if (subscriptionStatus === SUBSCRIPTION_STATUS.EXPIRED) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            success: false, 
            message: 'Your subscription has expired. Please renew to continue using the service.',
            code: 'SUBSCRIPTION_EXPIRED',
            details: {
              status: subscriptionStatus,
              expiredAt: subscription.currentPeriodEnd,
              merchantId: merchant.id,
              merchantName: merchant.name
            }
          },
          { status: 403 }
        )
      };
    }

    // Block if subscription is PAST_DUE
    if (subscriptionStatus === SUBSCRIPTION_STATUS.PAST_DUE) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            success: false, 
            message: 'Your payment is overdue. Please update your payment method to continue.',
            code: 'SUBSCRIPTION_PAST_DUE',
            details: {
              status: subscriptionStatus,
              merchantId: merchant.id,
              merchantName: merchant.name
            }
          },
          { status: 403 }
        )
      };
    }

    // Subscription is active or trial - allow access
    return { success: true };
  } catch (error) {
    console.error('Subscription status check error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { 
          success: false, 
          message: 'Failed to verify subscription status',
          code: 'SUBSCRIPTION_CHECK_FAILED'
        },
        { status: 500 }
      )
    };
  }
}

// ============================================================================
// CORE TYPES
// ============================================================================

// Re-export UserRole from constants (single source of truth)
export type { UserRole } from '@rentalshop/constants';
export type Role = UserRole; // Alias for backward compatibility

export type Permission = 
  // System Management
  | 'system.manage'
  | 'system.view'
  
  // Merchant Management
  | 'merchant.manage'
  | 'merchant.view'
  
  // Outlet Management
  | 'outlet.manage'
  | 'outlet.view'
  
  // User Management
  | 'users.manage'
  | 'users.view'
  
  // Product Management
  | 'products.manage'
  | 'products.view'
  | 'products.export'
  
  // Order Management (Granular Permissions)
  | 'orders.create'
  | 'orders.view'
  | 'orders.update'
  | 'orders.delete'
  | 'orders.export'
  | 'orders.manage' // Full order management (create, view, update, delete, export)
  
  // Customer Management
  | 'customers.manage'
  | 'customers.view'
  | 'customers.export'
  
  // Analytics
  | 'analytics.view'
  
  // Billing & Plans
  | 'billing.manage'
  | 'billing.view';

export type Resource = 'system' | 'merchant' | 'outlet' | 'users' | 'products' | 'orders' | 'customers' | 'analytics' | 'billing';

export interface UserScope {
  merchantId?: number;
  outletId?: number;
  canAccessSystem: boolean;
}

export interface AuthorizedRequest {
  request: NextRequest;
  user: AuthUser;
  userScope: UserScope;
}

// ============================================================================
// ROLE-PERMISSION MAPPING (SINGLE SOURCE OF TRUTH)
// ============================================================================

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  'ADMIN': [
    'system.manage', 'system.view',
    'merchant.manage', 'merchant.view',
    'outlet.manage', 'outlet.view',
    'users.manage', 'users.view',
    'products.manage', 'products.view', 'products.export',
    'orders.create', 'orders.view', 'orders.update', 'orders.delete', 'orders.export', 'orders.manage',
    'customers.manage', 'customers.view', 'customers.export',
    'analytics.view',
    'billing.manage', 'billing.view'
  ],
  'MERCHANT': [
    'merchant.view',
    'outlet.manage', 'outlet.view',
    'users.manage', 'users.view',
    'products.manage', 'products.view', 'products.export',
    'orders.create', 'orders.view', 'orders.update', 'orders.delete', 'orders.export', 'orders.manage',
    'customers.manage', 'customers.view', 'customers.export',
    'analytics.view',
    'billing.view'
  ],
  'OUTLET_ADMIN': [
    'outlet.view',
    'users.view',
    'products.manage', 'products.view', 'products.export',
    'orders.create', 'orders.view', 'orders.update', 'orders.delete', 'orders.export', 'orders.manage',
    'customers.manage', 'customers.view', 'customers.export',
    'analytics.view'
  ],
  'OUTLET_STAFF': [
    'outlet.view',
    'products.view', // ❌ NO products.export
    'orders.create', 'orders.view', 'orders.update', // ❌ NO orders.delete, orders.export
    'customers.view', 'customers.manage' // ❌ NO customers.export
  ]
};

// ============================================================================
// CORE AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Authenticate request and return user or error
 * This is the SINGLE authentication function used everywhere
 */
export async function authenticateRequest(request: NextRequest): Promise<{
  success: true;
  user: AuthUser;
} | {
  success: false;
  response: NextResponse;
}> {
  try {
    // Extract token from Authorization header
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, code: 'ACCESS_TOKEN_REQUIRED', message: 'Access token required' },
          { status: 401 }
        )
      };
    }

    // Verify token and get user
    let user;
    try {
      user = await verifyTokenSimple(token);
    } catch (error) {
      // Check if it's a subscription/plan limit error
      if (error instanceof PlanLimitError) {
        return {
          success: false,
          response: NextResponse.json(
            { 
              success: false, 
              message: error.message,
              errorCode: 'SUBSCRIPTION_ERROR'
            },
            { status: 402 } // Payment Required for subscription issues
          )
        };
      }
      
      // For other errors, treat as authentication failure
      return {
        success: false,
        response: NextResponse.json(
          { success: false, code: 'INVALID_TOKEN', message: 'Invalid token' },
          { status: 401 }
        )
      };
    }
    
    if (!user) {
      return {
        success: false,
        response: NextResponse.json(
          { success: false, code: 'INVALID_TOKEN', message: 'Invalid token' },
          { status: 401 }
        )
      };
    }

    // ============================================================================
    // SESSION VALIDATION (Single Session Enforcement)
    // ============================================================================
    // Check if session is still valid (not invalidated by a newer login)
    if (user.sessionId) {
      const isSessionValid = await db.sessions.validateSession(user.sessionId);
      if (!isSessionValid) {
        return {
          success: false,
          response: NextResponse.json(
            { 
              success: false, 
              code: 'SESSION_EXPIRED', 
              message: 'Your session has expired. Please login again.' 
            },
            { status: 401 }
          )
        };
      }
    }

    // ============================================================================
    // SUBSCRIPTION STATUS CHECK
    // ============================================================================
    // Check if merchant has active subscription (skip for ADMIN users)
    if (user.role !== 'ADMIN' && user.merchantId) {
      const subscriptionCheck = await checkMerchantSubscriptionStatus(user.merchantId);
      if (!subscriptionCheck.success) {
        return {
          success: false,
          response: subscriptionCheck.response!
        };
      }
    }

    // Transform the JWT payload to match AuthUser interface
    // Note: JWT only contains basic info, full user data should be fetched from database in API routes
    const transformedUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: '', // Will be populated from database in API routes
      lastName: '',  // Will be populated from database in API routes
      name: user.email, // Use email as fallback name
      role: user.role,
      phone: undefined, // Will be populated from database in API routes
      merchantId: user.merchantId ?? undefined,
      outletId: user.outletId ?? undefined,
      merchant: undefined, // Will be populated from database in API routes
      outlet: undefined   // Will be populated from database in API routes
    };

    return {
      success: true,
      user: transformedUser
    };
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Handle subscription-related errors
    if (error instanceof Error && error.message.includes('subscription')) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            success: false, 
            message: error.message,
            code: 'SUBSCRIPTION_ERROR'
          },
          { status: API.STATUS.FORBIDDEN }
        )
      };
    }

    return {
      success: false,
      response: NextResponse.json(
        { success: false, code: 'AUTHENTICATION_FAILED', message: 'Authentication failed' },
        { status: 401 }
      )
    };
  }
}

// ============================================================================
// CORE AUTHORIZATION FUNCTIONS
// ============================================================================

/**
 * Get user scope for database operations
 * This is the SINGLE function that determines data access scope
 */
export function getUserScope(user: AuthUser): UserScope {
  // Use merchantId/outletId from JWT payload first, fallback to merchant/outlet objects
  const merchantId = user.merchantId || user.merchant?.id;
  const outletId = user.outletId || user.outlet?.id;
  
  console.log('🔍 getUserScope - User merchant info:', {
    'user.merchantId': user.merchantId,
    'user.merchant?.id': user.merchant?.id,
    'user.outletId': user.outletId,
    'user.outlet?.id': user.outlet?.id,
    'resolved merchantId': merchantId,
    'resolved outletId': outletId,
    'user.role': user.role
  });
  
  return {
    merchantId,
    outletId,
    canAccessSystem: user.role === 'ADMIN'
  };
}

/**
 * Check if user has specific permission
 * This is the SINGLE permission checking function
 */
export function hasPermission(user: AuthUser, permission: Permission): boolean {
  const userPermissions = ROLE_PERMISSIONS[user.role as Role] || [];
  return userPermissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export function hasAnyPermission(user: AuthUser, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(user, permission));
}

/**
 * Check if user has all of the specified permissions
 */
export function hasAllPermissions(user: AuthUser, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(user, permission));
}

/**
 * Check if user can access a specific resource
 */
export function canAccessResource(user: AuthUser, resource: Resource, action: 'view' | 'manage' = 'view'): boolean {
  const permission = `${resource}.${action}` as Permission;
  return hasPermission(user, permission);
}

/**
 * Normalize role string to Role type
 */
function normalizeRole(role: string | undefined | null): Role | null {
  if (!role) return null;
  const upper = role.toUpperCase();
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'MERCHANT') return 'MERCHANT';
  if (upper === 'OUTLET_ADMIN') return 'OUTLET_ADMIN';
  if (upper === 'OUTLET_STAFF') return 'OUTLET_STAFF';
  return null;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: Pick<AuthUser, 'role'>, allowed: Role[]): boolean {
  const r = normalizeRole(user.role);
  return !!r && allowed.includes(r);
}

// ============================================================================
// CONVENIENCE FUNCTIONS (for backward compatibility)
// ============================================================================

/**
 * Check if user has merchant-level access
 */
export function isMerchantLevel(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT']);
}

/**
 * Check if user has outlet-level access
 */
export function isOutletTeam(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['OUTLET_ADMIN', 'OUTLET_STAFF']);
}

/**
 * Check if user can manage other users
 */
export function canManageUsers(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
}

/**
 * Assert that user has any of the specified roles (throws error if not)
 */
export function assertAnyRole(user: Pick<AuthUser, 'role'>, allowed: Role[]): void {
  if (!hasAnyRole(user, allowed)) {
    throw new Error(`Insufficient permissions. Required roles: ${allowed.join(', ')}`);
  }
}


/**
 * Check if user can manage outlets
 */
export function canManageOutlets(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT']);
}

/**
 * Check if user can manage products
 */
export function canManageProducts(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
}

/**
 * Check if user can access user management operations
 */
export function canAccessUserManagement(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
}

// ============================================================================
// ORDER-SPECIFIC PERMISSION FUNCTIONS
// ============================================================================

/**
 * Check if user can create orders
 */
export function canCreateOrders(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
}

/**
 * Check if user can view orders
 */
export function canViewOrders(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
}

/**
 * Check if user can update orders
 */
export function canUpdateOrders(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
}

/**
 * Check if user can delete orders
 * Only ADMIN, MERCHANT, and OUTLET_ADMIN can delete orders
 * OUTLET_STAFF cannot delete orders
 */
export function canDeleteOrders(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
}

/**
 * Check if user can manage orders (full CRUD operations)
 */
export function canManageOrders(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
}

/**
 * Check if user can export orders
 * Only ADMIN, MERCHANT, and OUTLET_ADMIN can export orders
 * OUTLET_STAFF cannot export orders
 */
export function canExportOrders(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
}

/**
 * Check if user can export products
 * Only ADMIN, MERCHANT, and OUTLET_ADMIN can export products
 * OUTLET_STAFF cannot export products
 */
export function canExportProducts(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
}

/**
 * Check if user can export customers
 * Only ADMIN, MERCHANT, and OUTLET_ADMIN can export customers
 * OUTLET_STAFF cannot export customers
 */
export function canExportCustomers(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
}

// ============================================================================
// SCOPE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate that a resource belongs to the user's scope
 */
export function validateScope(
  userScope: UserScope,
  requiredScope: { merchantId?: number; outletId?: number }
): { valid: boolean; error?: NextResponse } {
  // System admins can access everything
  if (userScope.canAccessSystem) {
    return { valid: true };
  }
  
  // Check merchant scope
  if (requiredScope.merchantId && userScope.merchantId !== requiredScope.merchantId) {
    return {
      valid: false,
      error: NextResponse.json(
        { 
          success: false, 
          message: 'Access denied: Cannot access data from other merchants',
          code: 'SCOPE_VIOLATION'
        },
        { status: API.STATUS.FORBIDDEN }
      )
    };
  }
  
  // Check outlet scope
  if (requiredScope.outletId && userScope.outletId !== requiredScope.outletId) {
    return {
      valid: false,
      error: NextResponse.json(
        { 
          success: false, 
          message: 'Access denied: Cannot access data from other outlets',
          code: 'SCOPE_VIOLATION'
        },
        { status: API.STATUS.FORBIDDEN }
      )
    };
  }
  
  return { valid: true };
}

// ============================================================================
// DATABASE SECURITY HELPERS
// ============================================================================

/**
 * Build secure where clause for database queries
 * This ensures data isolation at the database level
 */
export function buildSecureWhereClause(
  userScope: UserScope,
  additionalWhere: any = {}
): any {
  const where = { ...additionalWhere };
  
  // System admins can access everything (no additional restrictions)
  if (userScope.canAccessSystem) {
    return where;
  }
  
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

// ============================================================================
// ERROR RESPONSE HELPERS
// ============================================================================

/**
 * Create standardized error responses for authorization failures
 */
export function createAuthError(message: string, code: string = 'AUTHORIZATION_ERROR', status: number = 403) {
  return NextResponse.json(
    { 
      success: false, 
      message,
      code,
      timestamp: new Date().toISOString()
    },
    { status }
  );
}

/**
 * Create standardized error responses for scope violations
 */
export function createScopeError(message: string = 'Access denied: Resource not in user scope') {
  return createAuthError(message, 'SCOPE_VIOLATION', 403);
}

/**
 * Create standardized error responses for permission denials
 */
export function createPermissionError(requiredPermission: string) {
  return createAuthError(
    `Insufficient permissions. Required: ${requiredPermission}`,
    'INSUFFICIENT_PERMISSIONS',
    403
  );
}
