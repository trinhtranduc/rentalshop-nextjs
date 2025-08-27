// ============================================================================
// PERMISSIONS TYPES
// ============================================================================

import { UserRole } from './roles';

export interface Permission {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
  roles: UserRole[];
}

export interface PermissionCheck {
  userRole: UserRole;
  resource: string;
  action: string;
  merchantId?: number;
  outletId?: number;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

export type PermissionAction = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'manage' 
  | 'view';

export type PermissionResource = 
  | 'users' 
  | 'outlets' 
  | 'products' 
  | 'orders' 
  | 'customers' 
  | 'analytics' 
  | 'settings';
