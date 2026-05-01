// ============================================================================
// PERMISSIONS & ROLE DEFINITIONS - CLIENT-SAFE
// ============================================================================
// This file contains permission and role definitions that are safe to use
// in client-side code. It does NOT import any server-only dependencies.
//
// DO NOT import server-only code here (database, utils/server, etc.)
// This file must be importable in client-side components.

import type { UserRole } from '@rentalshop/constants';

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
  | 'products.create'
  | 'products.update'
  | 'products.view'
  | 'products.export'
  
  // Post Management (Blog CMS)
  | 'posts.manage'
  | 'posts.view'
  
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
  
  // Analytics (Granular Permissions)
  | 'analytics.view'                    // Base permission (backward compatibility)
  | 'analytics.view.dashboard'          // Dashboard & overview metrics (today, today-metrics)
  | 'analytics.view.revenue'            // Revenue/income analytics (full access)
  | 'analytics.view.revenue.daily'      // Daily income analytics only (limited access)
  | 'analytics.view.orders'             // Order analytics
  | 'analytics.view.customers'          // Customer analytics (top customers)
  | 'analytics.view.products'          // Product analytics (top products)
  | 'analytics.view.system'             // System-wide analytics (admin only)
  | 'analytics.export'                  // Export analytics data
  
  // Billing & Plans
  | 'billing.manage'
  | 'billing.view'
  
  // Bank Account Management
  | 'bankAccounts.manage'
  | 'bankAccounts.view';

export type Resource = 'system' | 'merchant' | 'outlet' | 'users' | 'products' | 'orders' | 'customers' | 'analytics' | 'billing' | 'bankAccounts';

// ============================================================================
// CRITICAL PERMISSIONS - Never Remove (Security & Functionality)
// ============================================================================

/**
 * Critical permissions that should NEVER be removed for each role
 * These are essential for basic functionality and security
 */
export const CRITICAL_PERMISSIONS: Record<Role, Permission[]> = {
  'ADMIN': [], // Admin has no restrictions
  
  'MERCHANT': [
    'merchant.view',        // Must view own merchant info
    'outlet.view',          // Must view outlets to manage business
    'products.manage',      // ✅ Critical: Must manage products (core business function)
    'products.view',        // Must view products to manage orders
    'orders.view',          // Must view orders for business operations
    'customers.view',       // Must view customers for order management
  ],
  
  'OUTLET_ADMIN': [
    'outlet.view',          // Must view own outlet
    'users.manage',         // ✅ Critical: Must manage outlet staff (core function)
    'products.manage',      // ✅ Critical: Must manage products (core function)
    'products.view',        // Must view products to process orders
    'orders.view',          // Must view orders for daily operations
    'customers.view',       // Must view customers for order management
  ],
  
  'OUTLET_STAFF': [
    'outlet.view',          // Must view own outlet
    'products.view',        // Must view products to check availability
    'products.create',      // May add products at outlet (no full manage / delete / import)
    'products.update',      // May update products at outlet
    'orders.view',          // Must view orders to process them
    'customers.view',       // Must view customers for order management
  ]
};

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
    'posts.manage', 'posts.view',
    'orders.create', 'orders.view', 'orders.update', 'orders.delete', 'orders.export', 'orders.manage',
    'customers.manage', 'customers.view', 'customers.export',
    'analytics.view',                    // Full access (backward compatibility)
    'analytics.view.dashboard',
    'analytics.view.revenue',
    'analytics.view.orders',
    'analytics.view.customers',
    'analytics.view.products',
    'analytics.view.system',
    'analytics.export',
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
    'analytics.view',                    // Full access - can see all outlets
    'analytics.view.dashboard',
    'analytics.view.revenue',
    'analytics.view.orders',
    'analytics.view.customers',
    'analytics.view.products',
    'analytics.export',
    // ❌ NO analytics.view.system (admin only)
    'billing.view',
    'bankAccounts.manage', 'bankAccounts.view' // ✅ Merchant can manage bank accounts
  ],
  'OUTLET_ADMIN': [
    'outlet.manage', 'outlet.view', 
    'users.manage', 'users.view',
    'products.manage', 'products.view', 'products.export',
    'orders.create', 'orders.view', 'orders.update', 'orders.delete', 'orders.export', 'orders.manage',
    'customers.manage', 'customers.view', 'customers.export',
    'analytics.view',                    // Full access - can see their outlet
    'analytics.view.dashboard',
    'analytics.view.revenue',
    'analytics.view.orders',
    'analytics.view.customers',
    'analytics.view.products',
    'analytics.export',
    // ❌ NO analytics.view.system (admin only)
    'billing.view',                      // ✅ Can view subscription status and plan limits
    'bankAccounts.manage', 'bankAccounts.view' // ✅ Outlet admin can manage bank accounts
  ],
  'OUTLET_STAFF': [
    'outlet.view',
    'products.view', // ❌ NO products.export
    'products.create',
    'products.update',
    'orders.create', 'orders.view', 'orders.update', // ❌ NO orders.delete, orders.export
    'customers.view', 'customers.manage', // ❌ NO customers.export
    'analytics.view.dashboard',          // ✅ Daily/today-metrics (dashboard only)
    'analytics.view.revenue.daily',      // ✅ Daily Income Analytics only (not full revenue analytics)
    // ❌ NO analytics.view.revenue (full revenue analytics)
    // ❌ NO analytics.view.orders, customers, products
    // ❌ NO analytics.export
    'billing.view',                      // ✅ Can view subscription status and plan limits (read-only)
    // ❌ NO billing.manage - staff cannot modify subscription
    // ❌ NO bankAccounts permissions - staff cannot see bank accounts
  ]
};
