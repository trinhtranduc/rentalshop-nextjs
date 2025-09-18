"use client"

import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { useSubscriptionStatusInfo } from './useSubscriptionStatusInfo';

// ============================================================================
// CAN PERFORM ACTION HOOK
// ============================================================================

export type ActionType = 
  | 'create_order'
  | 'edit_order'
  | 'delete_order'
  | 'create_customer'
  | 'edit_customer'
  | 'delete_customer'
  | 'create_product'
  | 'edit_product'
  | 'delete_product'
  | 'view_analytics'
  | 'manage_users'
  | 'manage_settings'
  | 'export_data'
  | 'bulk_operations'
  | string; // Allow custom actions

export interface ActionPermission {
  action: ActionType;
  requiresSubscription?: boolean;
  requiredFeatures?: string[];
  requiredRole?: string[];
  customCheck?: (user: any, subscription: any) => boolean;
}

export function useCanPerform(action: ActionType): boolean {
  const { user } = useAuth();
  const { hasActiveSubscription, isExpired, canAccessFeature } = useSubscriptionStatusInfo();

  const checkPermission = useCallback((action: ActionType): boolean => {
    // If no user, deny all actions
    if (!user) {
      return false;
    }

    // Define action permissions
    const actionPermissions: Record<ActionType, ActionPermission> = {
      // Order actions
      'create_order': {
        action: 'create_order',
        requiresSubscription: true,
        requiredFeatures: ['orders']
      },
      'edit_order': {
        action: 'edit_order',
        requiresSubscription: true,
        requiredFeatures: ['orders']
      },
      'delete_order': {
        action: 'delete_order',
        requiresSubscription: true,
        requiredFeatures: ['orders']
      },
      
      // Customer actions
      'create_customer': {
        action: 'create_customer',
        requiresSubscription: true,
        requiredFeatures: ['customers']
      },
      'edit_customer': {
        action: 'edit_customer',
        requiresSubscription: true,
        requiredFeatures: ['customers']
      },
      'delete_customer': {
        action: 'delete_customer',
        requiresSubscription: true,
        requiredFeatures: ['customers']
      },
      
      // Product actions
      'create_product': {
        action: 'create_product',
        requiresSubscription: true,
        requiredFeatures: ['products']
      },
      'edit_product': {
        action: 'edit_product',
        requiresSubscription: true,
        requiredFeatures: ['products']
      },
      'delete_product': {
        action: 'delete_product',
        requiresSubscription: true,
        requiredFeatures: ['products']
      },
      
      // Analytics and reporting
      'view_analytics': {
        action: 'view_analytics',
        requiresSubscription: true,
        requiredFeatures: ['analytics']
      },
      'export_data': {
        action: 'export_data',
        requiresSubscription: true,
        requiredFeatures: ['analytics', 'export']
      },
      
      // User management
      'manage_users': {
        action: 'manage_users',
        requiresSubscription: true,
        requiredRole: ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']
      },
      
      // Settings
      'manage_settings': {
        action: 'manage_settings',
        requiresSubscription: true,
        requiredRole: ['ADMIN', 'MERCHANT']
      },
      
      // Bulk operations
      'bulk_operations': {
        action: 'bulk_operations',
        requiresSubscription: true,
        requiredFeatures: ['bulk_operations']
      }
    };

    const permission = actionPermissions[action];
    
    // If no specific permission defined, allow for now (backward compatibility)
    if (!permission) {
      return true;
    }

    // Check subscription requirements
    if (permission.requiresSubscription) {
      if (!hasActiveSubscription || isExpired) {
        return false;
      }
    }

    // Check required features
    if (permission.requiredFeatures) {
      for (const feature of permission.requiredFeatures) {
        if (!canAccessFeature(feature)) {
          return false;
        }
      }
    }

    // Check required roles
    if (permission.requiredRole) {
      if (!permission.requiredRole.includes(user.role)) {
        return false;
      }
    }

    // Custom check
    if (permission.customCheck) {
      return permission.customCheck(user, { hasActiveSubscription, isExpired });
    }

    return true;
  }, [user, hasActiveSubscription, isExpired, canAccessFeature]);

  return checkPermission(action);
}
