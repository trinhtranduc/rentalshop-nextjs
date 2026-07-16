//
//  PermissionManager.swift
//  POS ADBD
//
//  Created by Assistant on 2025-01-28.
//  Copyright © 2025 Trinh Tran. All rights reserved.
//

import Foundation

/// PermissionManager provides utilities for checking user permissions
/// Based on the permission strings from the login response
class PermissionManager {
    
    // MARK: - Singleton
    
    static let shared = PermissionManager()
    
    private init() {}
    
    // MARK: - Permission Checking Methods
    
    /// Check if the current user has a specific permission
    /// - Parameter permission: The permission string to check (e.g., "products.view", "orders.create")
    /// - Returns: true if user has the permission, false otherwise
    func hasPermission(_ permission: String) -> Bool {
        guard let user = User.current() else {
            print("⚠️ Permission check failed: No current user")
            return false
        }
        
        let hasPermission = user.permissions.contains(permission)
        
        if !hasPermission {
            print("🔒 Permission denied: User does not have '\(permission)'")
            print("   User permissions: \(user.permissions)")
        }
        
        return hasPermission
    }
    
    /// Check if the current user has any of the specified permissions
    /// - Parameter permissions: Array of permission strings to check
    /// - Returns: true if user has at least one of the permissions, false otherwise
    func hasAnyPermission(_ permissions: [String]) -> Bool {
        guard let user = User.current() else {
            print("⚠️ Permission check failed: No current user")
            return false
        }
        
        for permission in permissions {
            if user.permissions.contains(permission) {
                return true
            }
        }
        
        print("🔒 Permission denied: User does not have any of: \(permissions)")
        return false
    }
    
    /// Check if the current user has all of the specified permissions
    /// - Parameter permissions: Array of permission strings to check
    /// - Returns: true if user has all permissions, false otherwise
    func hasAllPermissions(_ permissions: [String]) -> Bool {
        guard let user = User.current() else {
            print("⚠️ Permission check failed: No current user")
            return false
        }
        
        for permission in permissions {
            if !user.permissions.contains(permission) {
                print("🔒 Permission denied: User missing '\(permission)'")
                return false
            }
        }
        
        return true
    }
    
    /// Check if the current user has a permission that matches a prefix pattern
    /// Useful for checking category-based permissions (e.g., "products.*", "orders.*")
    /// - Parameter prefix: The permission prefix to check (e.g., "products", "orders.view")
    /// - Returns: true if user has any permission starting with the prefix, false otherwise
    func hasPermissionPrefix(_ prefix: String) -> Bool {
        guard let user = User.current() else {
            print("⚠️ Permission check failed: No current user")
            return false
        }
        
        for permission in user.permissions {
            if permission.hasPrefix(prefix) {
                return true
            }
        }
        
        print("🔒 Permission denied: User does not have any permission starting with '\(prefix)'")
        return false
    }
    
    // MARK: - Convenience Methods for Common Permissions
    
    /// Check if user can fully manage products (import / bulk / categories)
    func canManageProducts() -> Bool {
        return hasPermission("products.manage")
    }

    /// Check if user can add or edit products (OUTLET_STAFF/OUTLET_MANAGER have create/update)
    func canAddOrEditProducts() -> Bool {
        return hasAnyPermission(["products.manage", "products.create", "products.update"])
    }

    /// Check if user can delete products (full manage OR granular products.delete for OUTLET_MANAGER)
    func canDeleteProducts() -> Bool {
        return hasAnyPermission(["products.manage", "products.delete"])
    }

    /// Check if user can view products
    func canViewProducts() -> Bool {
        return hasAnyPermission(["products.view", "products.manage"])
    }
    
    /// Check if user can export products
    func canExportProducts() -> Bool {
        return hasAnyPermission(["products.export", "products.manage"])
    }
    
    /// Check if user can create orders
    func canCreateOrders() -> Bool {
        return hasAnyPermission(["orders.create", "orders.manage"])
    }
    
    /// Check if user can view orders
    func canViewOrders() -> Bool {
        return hasAnyPermission(["orders.view", "orders.manage"])
    }
    
    /// Check if user can update orders
    func canUpdateOrders() -> Bool {
        return hasAnyPermission(["orders.update", "orders.manage"])
    }
    
    /// Check if user can delete orders
    func canDeleteOrders() -> Bool {
        return hasAnyPermission(["orders.delete", "orders.manage"])
    }
    
    /// Check if user can export orders
    func canExportOrders() -> Bool {
        return hasAnyPermission(["orders.export", "orders.manage"])
    }
    
    /// Check if user can manage orders (full access)
    func canManageOrders() -> Bool {
        return hasPermission("orders.manage")
    }
    
    /// Check if user can manage customers
    func canManageCustomers() -> Bool {
        return hasPermission("customers.manage")
    }
    
    /// Check if user can view customers
    func canViewCustomers() -> Bool {
        return hasAnyPermission(["customers.view", "customers.manage"])
    }
    
    /// Check if user can export customers
    func canExportCustomers() -> Bool {
        return hasAnyPermission(["customers.export", "customers.manage"])
    }
    
    /// Check if user can view analytics
    func canViewAnalytics() -> Bool {
        return hasAnyPermission(["analytics.view", "analytics.view.dashboard"])
    }
    
    /// Check if user can view analytics dashboard
    func canViewAnalyticsDashboard() -> Bool {
        return hasAnyPermission(["analytics.view.dashboard", "analytics.view"])
    }

    /// Check if user can view full revenue analytics (yearly overview: income, growth, top lists)
    /// Mirrors backend requirement `analytics.view.revenue`.
    /// Note: `analytics.view` grants all granular analytics permissions via backward-compat on the API,
    /// so we accept it here too. `analytics.view.dashboard` alone is NOT enough (OUTLET_STAFF case).
    func canViewRevenueAnalytics() -> Bool {
        return hasAnyPermission(["analytics.view.revenue", "analytics.view"])
    }
    
    /// Check if user can export analytics
    func canExportAnalytics() -> Bool {
        return hasAnyPermission(["analytics.export", "analytics.view"])
    }
    
    /// Check if user can manage system settings
    func canManageSystem() -> Bool {
        return hasPermission("system.manage")
    }
    
    /// Check if user can view system settings
    func canViewSystem() -> Bool {
        return hasAnyPermission(["system.view", "system.manage"])
    }
    
    /// Check if user can manage merchants
    func canManageMerchants() -> Bool {
        return hasPermission("merchant.manage")
    }
    
    /// Check if user can view merchants
    func canViewMerchants() -> Bool {
        return hasAnyPermission(["merchant.view", "merchant.manage"])
    }
    
    /// Check if user can manage outlets
    func canManageOutlets() -> Bool {
        return hasPermission("outlet.manage")
    }
    
    /// Check if user can view outlets
    func canViewOutlets() -> Bool {
        return hasAnyPermission(["outlet.view", "outlet.manage"])
    }
    
    /// Check if user can manage users
    func canManageUsers() -> Bool {
        return hasPermission("users.manage")
    }
    
    /// Check if user can view users
    func canViewUsers() -> Bool {
        return hasAnyPermission(["users.view", "users.manage"])
    }
    
    /// Check if user can manage billing
    func canManageBilling() -> Bool {
        return hasPermission("billing.manage")
    }
    
    /// Check if user can view billing
    func canViewBilling() -> Bool {
        return hasAnyPermission(["billing.view", "billing.manage"])
    }
    
    /// Check if user can manage bank accounts
    func canManageBankAccounts() -> Bool {
        return hasPermission("bankAccounts.manage")
    }
    
    /// Check if user can view bank accounts
    func canViewBankAccounts() -> Bool {
        return hasAnyPermission(["bankAccounts.view", "bankAccounts.manage"])
    }
    
    // MARK: - Permission List Methods
    
    /// Get all permissions for the current user
    /// - Returns: Array of permission strings, or empty array if no user
    func getAllPermissions() -> [String] {
        guard let user = User.current() else {
            return []
        }
        return user.permissions
    }
    
    /// Get permissions count for the current user
    /// - Returns: Number of permissions, or 0 if no user
    func getPermissionsCount() -> Int {
        guard let user = User.current() else {
            return 0
        }
        return user.permissions.count
    }
    
    /// Check if user has any permissions at all
    /// - Returns: true if user has at least one permission, false otherwise
    func hasAnyPermissions() -> Bool {
        guard let user = User.current() else {
            return false
        }
        return !user.permissions.isEmpty
    }
}

