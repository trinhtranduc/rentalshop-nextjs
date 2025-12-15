'use client';

import { useMemo } from 'react';
import { useAuth } from './useAuth';

// ============================================================================
// PERMISSION TYPES
// ============================================================================

/**
 * Permission string type matching backend Permission type
 * These are the same permissions defined in packages/auth/src/core.ts
 */
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
  
  // Order Management
  | 'orders.create'
  | 'orders.view'
  | 'orders.update'
  | 'orders.delete'
  | 'orders.export'
  | 'orders.manage'
  
  // Customer Management
  | 'customers.manage'
  | 'customers.view'
  | 'customers.export'
  
  // Analytics (Granular Permissions)
  | 'analytics.view'                    // Base permission (backward compatibility)
  | 'analytics.view.dashboard'          // Dashboard & overview metrics (today, today-metrics)
  | 'analytics.view.revenue'            // Revenue/income analytics (full access)
  | 'analytics.view.revenue.daily'     // Daily income analytics only (limited access)
  | 'analytics.view.orders'            // Order analytics
  | 'analytics.view.customers'         // Customer analytics (top customers)
  | 'analytics.view.products'         // Product analytics (top products)
  | 'analytics.view.system'            // System-wide analytics (admin only)
  | 'analytics.export'                 // Export analytics data
  
  // Billing & Plans
  | 'billing.manage'
  | 'billing.view'
  
  // Bank Account Management
  | 'bankAccounts.manage'
  | 'bankAccounts.view';

// ============================================================================
// USE PERMISSIONS HOOK
// ============================================================================

/**
 * Hook to check user permissions for UI control
 * 
 * @example
 * ```tsx
 * const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
 * 
 * // Check single permission
 * if (hasPermission('products.manage')) {
 *   return <Button>Add Product</Button>;
 * }
 * 
 * // Check multiple permissions (OR logic)
 * if (hasAnyPermission(['products.manage', 'products.view'])) {
 *   return <ProductList />;
 * }
 * 
 * // Check multiple permissions (AND logic)
 * if (hasAllPermissions(['products.manage', 'products.export'])) {
 *   return <ExportButton />;
 * }
 * ```
 */
export function usePermissions() {
  const { user } = useAuth();

  // Get permissions array from user object
  const permissions = useMemo(() => {
    return user?.permissions || [];
  }, [user?.permissions]);

  /**
   * Check if user has a specific permission
   * Supports backward compatibility: 'analytics.view' grants all granular analytics permissions
   * @param permission - Permission string to check
   * @returns true if user has the permission
   */
  const hasPermission = useMemo(() => {
    return (permission: Permission): boolean => {
      if (!user || !permissions.length) {
        return false;
      }
      
      // Direct permission check
      if (permissions.includes(permission)) {
        return true;
      }
      
      // Backward compatibility: analytics.view grants all granular analytics permissions
      if (permission.startsWith('analytics.view.') || permission === 'analytics.export') {
        if (permissions.includes('analytics.view')) {
          return true;
        }
      }
      
      return false;
    };
  }, [user, permissions]);

  /**
   * Check if user has ANY of the specified permissions (OR logic)
   * @param requiredPermissions - Array of permission strings
   * @returns true if user has at least one of the permissions
   */
  const hasAnyPermission = useMemo(() => {
    return (requiredPermissions: Permission[]): boolean => {
      if (!user || !permissions.length || !requiredPermissions.length) {
        return false;
      }
      return requiredPermissions.some(permission => permissions.includes(permission));
    };
  }, [user, permissions]);

  /**
   * Check if user has ALL of the specified permissions (AND logic)
   * @param requiredPermissions - Array of permission strings
   * @returns true if user has all of the permissions
   */
  const hasAllPermissions = useMemo(() => {
    return (requiredPermissions: Permission[]): boolean => {
      if (!user || !permissions.length || !requiredPermissions.length) {
        return false;
      }
      return requiredPermissions.every(permission => permissions.includes(permission));
    };
  }, [user, permissions]);

  /**
   * Convenience methods for common permission checks
   */
  const canManageProducts = useMemo(() => hasPermission('products.manage'), [hasPermission]);
  const canViewProducts = useMemo(() => hasPermission('products.view'), [hasPermission]);
  const canExportProducts = useMemo(() => hasPermission('products.export'), [hasPermission]);
  
  const canManageOrders = useMemo(() => hasPermission('orders.manage'), [hasPermission]);
  const canCreateOrders = useMemo(() => hasPermission('orders.create'), [hasPermission]);
  const canUpdateOrders = useMemo(() => hasPermission('orders.update'), [hasPermission]);
  const canDeleteOrders = useMemo(() => hasPermission('orders.delete'), [hasPermission]);
  const canViewOrders = useMemo(() => hasPermission('orders.view'), [hasPermission]);
  const canExportOrders = useMemo(() => hasPermission('orders.export'), [hasPermission]);
  
  const canManageCustomers = useMemo(() => hasPermission('customers.manage'), [hasPermission]);
  const canViewCustomers = useMemo(() => hasPermission('customers.view'), [hasPermission]);
  const canExportCustomers = useMemo(() => hasPermission('customers.export'), [hasPermission]);
  
  const canManageUsers = useMemo(() => hasPermission('users.manage'), [hasPermission]);
  const canViewUsers = useMemo(() => hasPermission('users.view'), [hasPermission]);
  
  const canManageOutlets = useMemo(() => hasPermission('outlet.manage'), [hasPermission]);
  const canViewOutlets = useMemo(() => hasPermission('outlet.view'), [hasPermission]);
  
  const canManageMerchants = useMemo(() => hasPermission('merchant.manage'), [hasPermission]);
  const canViewMerchants = useMemo(() => hasPermission('merchant.view'), [hasPermission]);
  
  // Analytics permissions (with backward compatibility)
  const canViewAnalytics = useMemo(() => hasPermission('analytics.view'), [hasPermission]);
  const canViewDashboard = useMemo(() => hasPermission('analytics.view.dashboard'), [hasPermission]);
  const canViewRevenue = useMemo(() => hasPermission('analytics.view.revenue'), [hasPermission]);
  const canViewRevenueDaily = useMemo(() => hasPermission('analytics.view.revenue.daily'), [hasPermission]);
  const canViewOrderAnalytics = useMemo(() => hasPermission('analytics.view.orders'), [hasPermission]);
  const canViewCustomerAnalytics = useMemo(() => hasPermission('analytics.view.customers'), [hasPermission]);
  const canViewProductAnalytics = useMemo(() => hasPermission('analytics.view.products'), [hasPermission]);
  const canExportAnalytics = useMemo(() => hasPermission('analytics.export'), [hasPermission]);
  
  const canManageBilling = useMemo(() => hasPermission('billing.manage'), [hasPermission]);
  const canViewBilling = useMemo(() => hasPermission('billing.view'), [hasPermission]);
  
  // Convenience methods for bank accounts
  const canManageBankAccounts = useMemo(() => hasPermission('bankAccounts.manage'), [hasPermission]);
  const canViewBankAccounts = useMemo(() => hasPermission('bankAccounts.view'), [hasPermission]);

  return {
    // Core permission checking methods
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions, // Raw permissions array
    
    // Convenience methods for products
    canManageProducts,
    canViewProducts,
    canExportProducts,
    
    // Convenience methods for orders
    canManageOrders,
    canCreateOrders,
    canUpdateOrders,
    canDeleteOrders,
    canViewOrders,
    canExportOrders,
    
    // Convenience methods for customers
    canManageCustomers,
    canViewCustomers,
    canExportCustomers,
    
    // Convenience methods for users
    canManageUsers,
    canViewUsers,
    
    // Convenience methods for outlets
    canManageOutlets,
    canViewOutlets,
    
    // Convenience methods for merchants
    canManageMerchants,
    canViewMerchants,
    
    // Convenience methods for analytics
    canViewAnalytics,
    canViewDashboard,
    canViewRevenue,
    canViewRevenueDaily,
    canViewOrderAnalytics,
    canViewCustomerAnalytics,
    canViewProductAnalytics,
    canExportAnalytics,
    
    // Convenience methods for billing
    canManageBilling,
    canViewBilling,
    
    // Convenience methods for bank accounts
    canManageBankAccounts,
    canViewBankAccounts,
  };
}

