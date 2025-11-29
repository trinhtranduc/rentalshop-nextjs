'use client';

import { useAuth } from './useAuth';

// ============================================================================
// USER ROLE HOOK - Simplified role checking
// ============================================================================

export interface UserRoleInfo {
  role: string | undefined;
  isAdmin: boolean;
  isMerchant: boolean;
  isOutletAdmin: boolean;
  isOutletStaff: boolean;
  canManageUsers: boolean;
  canManageProducts: boolean;
  canManageCategories: boolean;
  canManageOutlets: boolean;
  canManageSubscriptions: boolean;
  canViewBilling: boolean;
  canExportData: boolean;
}

export function useUserRole(): UserRoleInfo {
  const { user } = useAuth();
  
  const role = user?.role;
  
  return {
    role,
    isAdmin: role === 'ADMIN',
    isMerchant: role === 'MERCHANT',
    isOutletAdmin: role === 'OUTLET_ADMIN',
    isOutletStaff: role === 'OUTLET_STAFF',
    
    // Permission checks
    canManageUsers: role === 'ADMIN' || role === 'MERCHANT' || role === 'OUTLET_ADMIN',
    canManageProducts: role === 'ADMIN' || role === 'MERCHANT' || role === 'OUTLET_ADMIN',
    canManageCategories: role === 'ADMIN' || role === 'MERCHANT',
    canManageOutlets: role === 'ADMIN' || role === 'MERCHANT',
    canManageSubscriptions: role === 'ADMIN' || role === 'MERCHANT',
    canViewBilling: role === 'ADMIN' || role === 'MERCHANT',
    canExportData: role === 'ADMIN' || role === 'MERCHANT' || role === 'OUTLET_ADMIN',
  };
}

// ============================================================================
// CONVENIENCE HOOKS FOR SPECIFIC PERMISSIONS
// ============================================================================

export function useCanManageProducts(): boolean {
  const { canManageProducts } = useUserRole();
  return canManageProducts;
}

export function useCanManageCategories(): boolean {
  const { canManageCategories } = useUserRole();
  return canManageCategories;
}

export function useCanManageUsers(): boolean {
  const { canManageUsers } = useUserRole();
  return canManageUsers;
}

export function useCanManageOutlets(): boolean {
  const { canManageOutlets } = useUserRole();
  return canManageOutlets;
}

export function useCanManageSubscriptions(): boolean {
  const { canManageSubscriptions } = useUserRole();
  return canManageSubscriptions;
}

export function useCanViewBilling(): boolean {
  const { canViewBilling } = useUserRole();
  return canViewBilling;
}

export function useCanExportData(): boolean {
  const { canExportData } = useUserRole();
  return canExportData;
}
