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
  | 'billing.view'
  
  // Bank Account Management
  | 'bankAccounts.manage'
  | 'bankAccounts.view';

export type Resource = 'system' | 'merchant' | 'outlet' | 'users' | 'products' | 'orders' | 'customers' | 'analytics' | 'billing' | 'bankAccounts';

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

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  'ADMIN': [
    'system.manage', 'system.view',
    'merchant.manage', 'merchant.view',
    'outlet.manage', 'outlet.view',
    'users.manage', 'users.view',
    'products.manage', 'products.view', 'products.export',
    'orders.create', 'orders.view', 'orders.update', 'orders.delete', 'orders.export', 'orders.manage',
    'customers.manage', 'customers.view', 'customers.export',
    'analytics.view',
    'billing.manage', 'billing.view',
    'bankAccounts.manage', 'bankAccounts.view'
  ],
  'MERCHANT': [
    'merchant.manage', 'merchant.view', // ✅ Merchant can manage their own merchant information
    'outlet.manage', 'outlet.view',
    'users.manage', 'users.view',
    'products.manage', 'products.view', 'products.export',
    'orders.create', 'orders.view', 'orders.update', 'orders.delete', 'orders.export', 'orders.manage',
    'customers.manage', 'customers.view', 'customers.export',
    'analytics.view',
    'billing.view',
    'bankAccounts.manage', 'bankAccounts.view' // ✅ Merchant can manage bank accounts
  ],
  'OUTLET_ADMIN': [
    'outlet.manage', 'outlet.view', 
    'users.view',
    'products.manage', 'products.view', 'products.export',
    'orders.create', 'orders.view', 'orders.update', 'orders.delete', 'orders.export', 'orders.manage',
    'customers.manage', 'customers.view', 'customers.export',
    'analytics.view',
    'bankAccounts.manage', 'bankAccounts.view' // ✅ Outlet admin can manage bank accounts
  ],
  'OUTLET_STAFF': [
    'outlet.view',
    'products.view', // ❌ NO products.export
    'orders.create', 'orders.view', 'orders.update', // ❌ NO orders.delete, orders.export
    'customers.view', 'customers.manage' // ❌ NO customers.export
    // ❌ NO bankAccounts permissions - staff cannot see bank accounts
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
    // USER ACTIVE STATUS CHECK
    // ============================================================================
    // Check if user account is active (not deactivated)
    const userRecord = await db.users.findById(user.id);
    if (!userRecord || !userRecord.isActive) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            success: false, 
            code: 'ACCOUNT_DEACTIVATED', 
            message: 'Your account has been deactivated. Please contact an administrator.' 
          },
          { status: 401 }
        )
      };
    }

    // ============================================================================
    // PASSWORD CHANGE CHECK (Invalidate old tokens when password changes)
    // ============================================================================
    // Check if password was changed after token was issued
    // Get passwordChangedAt from database
    const dbPasswordChangedAt = (userRecord as any).passwordChangedAt 
      ? Math.floor((userRecord as any).passwordChangedAt.getTime() / 1000) // Convert to Unix timestamp
      : null;
    
    // Get passwordChangedAt from token payload (from verifyTokenSimple)
    const tokenPasswordChangedAt = (user as any).passwordChangedAt;
    
    // If password was changed after token was issued, invalidate token
    if (dbPasswordChangedAt !== null) {
      // Add small tolerance (500ms) for timing differences to handle edge cases
      // where token is created at the same time or slightly before database update
      // This handles database commit timing and small clock skew
      const tolerance = 0.5; // Allow 500ms difference for timing (0.5 seconds)
      
      // Token is valid if it has passwordChangedAt and it's >= (dbPasswordChangedAt - tolerance)
      // This allows tokens created at the same time or slightly before (within 500ms) to be valid
      const isValid = tokenPasswordChangedAt !== null && 
                      tokenPasswordChangedAt !== undefined &&
                      tokenPasswordChangedAt >= (dbPasswordChangedAt - tolerance);
      
      if (!isValid) {
        // Log for debugging
        console.log('🔍 TOKEN INVALIDATION:', {
          tokenPasswordChangedAt,
          dbPasswordChangedAt,
          difference: tokenPasswordChangedAt ? dbPasswordChangedAt - tokenPasswordChangedAt : 'N/A',
          tolerance,
          isValid
        });
        
        return {
          success: false,
          response: NextResponse.json(
            { 
              success: false, 
              code: 'TOKEN_INVALIDATED', 
              message: 'Your session has expired due to password change. Please login again.' 
            },
            { status: 401 }
          )
        };
      }
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
    canAccessSystem: user.role === USER_ROLE.ADMIN
  };
}

/**
 * Get permissions for a user (custom merchant permissions or default)
 * Priority: Custom merchant permissions > Default ROLE_PERMISSIONS
 * 
 * @param user - User object with role and merchantId
 * @returns Array of permissions for the user's role
 */
export async function getUserPermissions(user: AuthUser): Promise<Permission[]> {
  // ADMIN users always use default permissions (no merchant-specific customization)
  if (user.role === 'ADMIN') {
    return ROLE_PERMISSIONS[user.role as Role] || [];
  }

  // For merchant/outlet users, check for custom roles or custom permissions
  if (user.merchantId) {
    try {
      // Priority 1: Check if user has a custom role (customRoleId)
      // This could be either a custom role OR a customized system role
      if ((user as any).customRoleId) {
        const merchantRole = await db.prisma.merchantRole.findUnique({
          where: {
            id: (user as any).customRoleId
          },
          select: {
            permissions: true,
            isActive: true,
            roleName: true,
            isSystemRole: true,
            systemRole: true
          }
        });

        // If merchant role exists and is active, use its permissions
        if (merchantRole && merchantRole.isActive && merchantRole.permissions.length > 0) {
          const roleType = merchantRole.isSystemRole ? 'customized system role' : 'custom role';
          console.log(`🔍 Using ${roleType} "${merchantRole.roleName}" permissions for merchant ${user.merchantId}`);
          return merchantRole.permissions as Permission[];
        }
      }

      // Priority 2: Check for custom permissions for system role (if user doesn't have customRoleId)
      // Look for MerchantRole where isSystemRole = true and systemRole matches user's role
      const systemRoleCustomization = await db.prisma.merchantRole.findFirst({
        where: {
          merchantId: user.merchantId,
          isSystemRole: true,
          systemRole: user.role as any,
          isActive: true
        },
        select: {
          permissions: true,
          isActive: true
        }
      });

      // If custom permissions exist and are active, use them
      if (systemRoleCustomization && systemRoleCustomization.isActive && systemRoleCustomization.permissions.length > 0) {
        console.log(`🔍 Using custom permissions for merchant ${user.merchantId}, system role ${user.role}`);
        return systemRoleCustomization.permissions as Permission[];
      }
    } catch (error) {
      // If database error, fallback to default (backward compatible)
      console.warn('⚠️ Error fetching custom permissions/roles, using default:', error);
    }
  }

  // Fallback to default permissions for system role
  return ROLE_PERMISSIONS[user.role as Role] || [];
}

/**
 * Check if user has a specific permission (async - supports custom permissions)
 * Uses custom merchant permissions if available, otherwise uses default ROLE_PERMISSIONS
 * 
 * @param user - User object with role and merchantId
 * @param permission - Permission to check
 * @returns true if user has the permission
 */
export async function hasPermission(user: AuthUser, permission: Permission): Promise<boolean> {
  const permissions = await getUserPermissions(user);
  return permissions.includes(permission);
}

/**
 * Synchronous version of hasPermission (for backward compatibility)
 * Uses default ROLE_PERMISSIONS only (doesn't check custom permissions)
 * 
 * @deprecated Use async hasPermission() instead for custom permissions support
 */
export function hasPermissionSync(user: AuthUser, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[user.role as Role] || [];
  if (rolePermissions.includes(permission)) {
    return true;
  }
  
  // Then check custom permissions (if user has any - from JWT token)
  if (user.permissions && user.permissions.length > 0) {
    return user.permissions.includes(permission);
  }
  
  return false;
}

/**
 * Check if user has any of the specified permissions (async - supports custom permissions)
 */
export async function hasAnyPermission(user: AuthUser, permissions: Permission[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(user);
  return permissions.some(permission => userPermissions.includes(permission));
}

/**
 * Check if user has all of the specified permissions (async - supports custom permissions)
 */
export async function hasAllPermissions(user: AuthUser, permissions: Permission[]): Promise<boolean> {
  const userPermissions = await getUserPermissions(user);
  return permissions.every(permission => userPermissions.includes(permission));
}

/**
 * Synchronous versions (for backward compatibility - uses default permissions only)
 * @deprecated Use async versions for custom permissions support
 */
export function hasAnyPermissionSync(user: AuthUser, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermissionSync(user, permission));
}

export function hasAllPermissionsSync(user: AuthUser, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermissionSync(user, permission));
}

/**
 * Check if user can access a specific resource (async - supports custom permissions)
 */
export async function canAccessResource(user: AuthUser, resource: Resource, action: 'view' | 'manage' = 'view'): Promise<boolean> {
  const permission = `${resource}.${action}` as Permission;
  return await hasPermission(user, permission);
}

/**
 * Synchronous version (for backward compatibility - uses default permissions only)
 * @deprecated Use async canAccessResource() instead for custom permissions support
 */
export function canAccessResourceSync(user: AuthUser, resource: Resource, action: 'view' | 'manage' = 'view'): boolean {
  const permission = `${resource}.${action}` as Permission;
  return hasPermissionSync(user, permission);
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
// MERCHANT/OUTLET AUTHORIZATION HELPERS
// ============================================================================

export interface MerchantOutletAuthOptions {
  /** Block OUTLET_STAFF from performing this action */
  blockOutletStaff?: boolean;
  /** Custom message when OUTLET_STAFF is blocked */
  blockOutletStaffMessage?: string;
  /** Merchant ID to validate ownership */
  merchantId?: number;
  /** Outlet ID to validate ownership */
  outletId?: number;
}

export interface MerchantOutletAuthResult {
  /** Whether authorization passed */
  authorized: boolean;
  /** Error response if authorization failed */
  error?: NextResponse;
}

/**
 * Validate authorization for merchant/outlet resources
 * 
 * This function handles common authorization patterns:
 * - Blocks OUTLET_STAFF if specified
 * - Validates merchant association for non-admin users
 * - Checks merchant ownership for MERCHANT role
 * - Checks outlet ownership for OUTLET_ADMIN role
 * 
 * @param user - Authenticated user
 * @param userScope - User's scope (merchantId, outletId)
 * @param options - Authorization options
 * @returns Authorization result with success/error
 * 
 * @example
 * ```typescript
 * const auth = validateMerchantOutletAccess(user, userScope, {
 *   blockOutletStaff: true,
 *   blockOutletStaffMessage: 'OUTLET_STAFF cannot update bank accounts',
 *   merchantId: merchantPublicId,
 *   outletId: outletPublicId
 * });
 * 
 * if (!auth.authorized) {
 *   return auth.error;
 * }
 * ```
 */
export function validateMerchantOutletAccess(
  user: AuthUser,
  userScope: UserScope,
  options: MerchantOutletAuthOptions = {}
): MerchantOutletAuthResult {
  const {
    blockOutletStaff = false,
    blockOutletStaffMessage = 'OUTLET_STAFF cannot perform this action',
    merchantId,
    outletId
  } = options;

  // Block OUTLET_STAFF if specified
  if (blockOutletStaff && user.role === USER_ROLE.OUTLET_STAFF) {
    return {
      authorized: false,
      error: NextResponse.json(
        { 
          success: false,
          code: 'FORBIDDEN',
          message: blockOutletStaffMessage
        },
        { status: API.STATUS.FORBIDDEN }
      )
    };
  }

  // Validate that non-admin users have merchant association
  if (user.role !== USER_ROLE.ADMIN && !userScope.merchantId) {
    return {
      authorized: false,
      error: NextResponse.json(
        { 
          success: false,
          code: 'MERCHANT_ASSOCIATION_REQUIRED',
          message: 'User must be associated with a merchant'
        },
        { status: API.STATUS.FORBIDDEN }
      )
    };
  }

  // Use validateScope for role-based scope validation
  // Build required scope based on user role and provided IDs
  const requiredScope: { merchantId?: number; outletId?: number } = {};
  
  // MERCHANT role: only check merchant ownership (not outlet)
  if (user.role === USER_ROLE.MERCHANT && merchantId !== undefined) {
    requiredScope.merchantId = merchantId;
  }
  
  // OUTLET_ADMIN/OUTLET_STAFF roles: check outlet ownership if outletId provided
  // If only merchantId is provided (no outletId), check merchant ownership instead
  if ((user.role === USER_ROLE.OUTLET_ADMIN || 
       (user.role === USER_ROLE.OUTLET_STAFF && !blockOutletStaff))) {
    if (outletId !== undefined) {
      // When outletId is provided, check outlet ownership
      requiredScope.outletId = outletId;
    } else if (merchantId !== undefined) {
      // When only merchantId is provided (merchant-only route), check merchant ownership
      // OUTLET_ADMIN/OUTLET_STAFF must belong to the merchant they're accessing
      requiredScope.merchantId = merchantId;
    }
  }
  
  // If we have scope requirements, validate using validateScope
  if (requiredScope.merchantId !== undefined || requiredScope.outletId !== undefined) {
    const scopeCheck = validateScope(userScope, requiredScope);
    if (!scopeCheck.valid) {
      return {
        authorized: false,
        error: scopeCheck.error
      };
    }
  }

  return { authorized: true };
}

// ============================================================================
// MERCHANT VALIDATION HELPERS
// ============================================================================

export interface ValidateMerchantAccessResult {
  /** Whether validation passed */
  valid: boolean;
  /** Merchant object if found */
  merchant?: any;
  /** Outlet object if found (for nested routes) */
  outlet?: any;
  /** Error response if validation failed */
  error?: NextResponse;
}

/**
 * Validate merchant access (and optionally outlet access) for routes
 * 
 * This unified helper function handles both patterns:
 * - Merchant-only routes: /api/merchants/[id]/...
 * - Nested outlet routes: /api/merchants/[id]/outlets/[outletId]/...
 * 
 * Validation steps:
 * 1. Validate merchant ID format
 * 2. Find merchant from database
 * 3. Check merchant exists
 * 4. Validate merchant association requirement
 * 5. Validate merchant scope (merchant ownership)
 * 6. (If outletPublicId provided) Validate outlet ID format
 * 7. (If outletPublicId provided) Find outlet from database
 * 8. (If outletPublicId provided) Check outlet exists
 * 9. (If outletPublicId provided) Verify outlet belongs to merchant
 * 10. (If outletPublicId provided) Validate outlet scope (for OUTLET_ADMIN/OUTLET_STAFF)
 * 
 * @param merchantPublicId - Merchant public ID from route params
 * @param user - Authenticated user
 * @param userScope - User's scope (merchantId, outletId)
 * @param outletPublicId - Optional outlet public ID for nested routes
 * @returns Validation result with merchant (and optionally outlet) objects or error
 * 
 * @example
 * ```typescript
 * // Merchant-only route
 * const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
 * if (!validation.valid) {
 *   return validation.error;
 * }
 * const merchant = validation.merchant;
 * 
 * // Nested outlet route
 * const validation = await validateMerchantAccess(merchantPublicId, user, userScope, outletPublicId);
 * if (!validation.valid) {
 *   return validation.error;
 * }
 * const { merchant, outlet } = validation;
 * ```
 */
export async function validateMerchantAccess(
  merchantPublicId: number,
  user: AuthUser,
  userScope: UserScope,
  outletPublicId?: number
): Promise<ValidateMerchantAccessResult> {
  // Validate merchant ID format
  if (isNaN(merchantPublicId)) {
    return {
      valid: false,
      error: NextResponse.json(
        { 
          success: false,
          code: 'INVALID_MERCHANT_ID_FORMAT',
          message: 'Invalid merchant ID format'
        },
        { status: 400 }
      )
    };
  }

  // Find merchant from database
  const merchant = await db.merchants.findById(merchantPublicId);
  if (!merchant) {
    return {
      valid: false,
      error: NextResponse.json(
        { 
          success: false,
          code: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found'
        },
        { status: API.STATUS.NOT_FOUND }
      )
    };
  }

  // Validate merchant association requirement (non-admin users must have merchantId)
  if (user.role !== USER_ROLE.ADMIN && !userScope.merchantId) {
    return {
      valid: false,
      error: NextResponse.json(
        { 
          success: false,
          code: 'MERCHANT_ASSOCIATION_REQUIRED',
          message: 'User must be associated with a merchant'
        },
        { status: API.STATUS.FORBIDDEN }
      )
    };
  }

  // Validate scope: verify user can access this merchant
  const scopeCheck = validateScope(userScope, { merchantId: merchantPublicId });
  if (!scopeCheck.valid) {
    // Return NOT_FOUND for security (don't reveal merchant exists if unauthorized)
    return {
      valid: false,
      error: NextResponse.json(
        { 
          success: false,
          code: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found'
        },
        { status: API.STATUS.NOT_FOUND }
      )
    };
  }

  // If outletPublicId is provided, validate outlet access
  if (outletPublicId !== undefined) {
    // Validate outlet ID format
    if (isNaN(outletPublicId)) {
      return {
        valid: false,
        error: NextResponse.json(
          { 
            success: false,
            code: 'INVALID_OUTLET_ID_FORMAT',
            message: 'Invalid outlet ID format'
          },
          { status: 400 }
        )
      };
    }

    // Find outlet from database
    const outlet = await db.outlets.findById(outletPublicId);
    if (!outlet) {
      return {
        valid: false,
        error: NextResponse.json(
          { 
            success: false,
            code: 'OUTLET_NOT_FOUND',
            message: 'Outlet not found'
          },
          { status: API.STATUS.NOT_FOUND }
        )
      };
    }

    // Verify outlet belongs to merchant
    if (outlet.merchant?.id !== merchantPublicId) {
      // Return NOT_FOUND for security (don't reveal outlet exists)
      return {
        valid: false,
        error: NextResponse.json(
          { 
            success: false,
            code: 'OUTLET_NOT_FOUND',
            message: 'Outlet not found'
          },
          { status: API.STATUS.NOT_FOUND }
        )
      };
    }

    // Validate outlet scope: OUTLET_ADMIN/OUTLET_STAFF can only access their assigned outlet
    const outletScopeCheck = validateScope(userScope, { outletId: outletPublicId });
    if (!outletScopeCheck.valid && (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF)) {
      // Return NOT_FOUND for security (don't reveal outlet exists)
      return {
        valid: false,
        error: NextResponse.json(
          { 
            success: false,
            code: 'OUTLET_NOT_FOUND',
            message: 'Outlet not found'
          },
          { status: API.STATUS.NOT_FOUND }
        )
      };
    }

    return {
      valid: true,
      merchant,
      outlet
    };
  }

  return {
    valid: true,
    merchant
  };
}

/**
 * @deprecated Use validateMerchantAccess with outletPublicId parameter instead
 * Validate merchant and outlet access for nested outlet routes
 */
export async function validateMerchantOutletRoute(
  merchantPublicId: number,
  outletPublicId: number,
  user: AuthUser,
  userScope: UserScope
): Promise<ValidateMerchantAccessResult> {
  return validateMerchantAccess(merchantPublicId, user, userScope, outletPublicId);
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
