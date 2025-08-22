// ============================================================================
// USER ROLES TYPES
// ============================================================================

export type UserRole = 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';

export interface RolePermissions {
  canManageUsers: boolean;
  canManageOutlets: boolean;
  canManageProducts: boolean;
  canManageOrders: boolean;
  canManageCustomers: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  ADMIN: {
    canManageUsers: true,
    canManageOutlets: true,
    canManageProducts: true,
    canManageOrders: true,
    canManageCustomers: true,
    canViewAnalytics: true,
    canManageSettings: true,
  },
  MERCHANT: {
    canManageUsers: true,
    canManageOutlets: true,
    canManageProducts: true,
    canManageOrders: true,
    canManageCustomers: true,
    canViewAnalytics: true,
    canManageSettings: true,
  },
  OUTLET_ADMIN: {
    canManageUsers: true,
    canManageOutlets: false,
    canManageProducts: true,
    canManageOrders: true,
    canManageCustomers: true,
    canViewAnalytics: true,
    canManageSettings: false,
  },
  OUTLET_STAFF: {
    canManageUsers: false,
    canManageOutlets: false,
    canManageProducts: false,
    canManageOrders: true,
    canManageCustomers: false,
    canViewAnalytics: false,
    canManageSettings: false,
  },
};
