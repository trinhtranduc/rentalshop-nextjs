import type { AuthUser } from './types';

export type Role = 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';

function normalizeRole(role: string | undefined | null): Role | null {
  if (!role) return null;
  const upper = role.toUpperCase();
  if (upper === 'ADMIN') return 'ADMIN';
  if (upper === 'MERCHANT') return 'MERCHANT';
  if (upper === 'OUTLET_ADMIN') return 'OUTLET_ADMIN';
  if (upper === 'OUTLET_STAFF') return 'OUTLET_STAFF';
  return null;
}

export function hasAnyRole(user: Pick<AuthUser, 'role'>, allowed: Role[]): boolean {
  const r = normalizeRole(user.role);
  return !!r && allowed.includes(r);
}

export function assertAnyRole(user: Pick<AuthUser, 'role'>, allowed: Role[]): void {
  if (!hasAnyRole(user, allowed)) {
    const roles = allowed.join(', ');
    throw new Error(`Forbidden: requires role ${roles}`);
  }
}

export function getUserScope(user: Partial<AuthUser>): { merchantId?: string; outletId?: string } {
  const merchantId = (user as any)?.merchant?.id as string | undefined;
  const outletId = (user as any)?.outlet?.id as string | undefined;
  return { merchantId, outletId };
}

/**
 * Check if user has merchant-level access (can manage multiple outlets)
 * ADMIN: System-wide access to all merchants
 * MERCHANT: Access to their own merchant organization
 */
export function isMerchantLevel(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT']);
}

/**
 * Check if user has outlet-level access (can manage specific outlet)
 * OUTLET_ADMIN: Full access to their assigned outlet
 * OUTLET_STAFF: Limited access to their assigned outlet
 */
export function isOutletTeam(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['OUTLET_ADMIN', 'OUTLET_STAFF']);
}

/**
 * Check if user can manage other users
 * ADMIN: Can manage all users system-wide
 * MERCHANT: Can manage users within their merchant organization
 * OUTLET_ADMIN: Can manage users within their outlet
 */
export function canManageUsers(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
}

/**
 * Check if user can manage outlets
 * ADMIN: Can manage all outlets system-wide
 * MERCHANT: Can manage outlets within their merchant organization
 */
export function canManageOutlets(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT']);
}

/**
 * Check if user can manage products
 * ADMIN: Can manage all products system-wide
 * MERCHANT: Can manage products within their merchant organization
 * OUTLET_ADMIN: Can manage products within their outlet
 */
export function canManageProducts(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
}

/**
 * Centralized function to check if user can access user management operations
 * ADMIN: Can access all users system-wide
 * MERCHANT: Can access users within their merchant organization
 * OUTLET_ADMIN: Can access users within their outlet
 * OUTLET_STAFF: Cannot access user management
 */
export function canAccessUserManagement(user: Pick<AuthUser, 'role'>): boolean {
  return hasAnyRole(user, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
}

/**
 * Get user scope for authorization checks
 * Returns the scope (merchantId, outletId) based on user role
 */
export function getUserManagementScope(user: Partial<AuthUser>): { 
  canAccess: boolean; 
  scope: { merchantId?: string; outletId?: string } 
} {
  const normalizedRole = normalizeRole(user.role);
  
  if (!normalizedRole) {
    return { canAccess: false, scope: {} };
  }
  
  switch (normalizedRole) {
    case 'ADMIN':
      return { 
        canAccess: true, 
        scope: {} // No scope restrictions for admin
      };
      
    case 'MERCHANT':
      return { 
        canAccess: true, 
        scope: { merchantId: user.merchant?.id }
      };
      
    case 'OUTLET_ADMIN':
      return { 
        canAccess: true, 
        scope: { 
          merchantId: user.merchant?.id, 
          outletId: user.outlet?.id 
        }
      };
      
    case 'OUTLET_STAFF':
      return { 
        canAccess: false, 
        scope: {} 
      };
      
    default:
      return { 
        canAccess: false, 
        scope: {} 
      };
  }
}


