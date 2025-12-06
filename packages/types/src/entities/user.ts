// ============================================================================
// USER ENTITY TYPES - CONSOLIDATED
// ============================================================================

import { 
  BaseEntity, 
  BaseEntityWithMerchant, 
  BaseEntityWithOutlet,
  Address, 
  ContactInfo,
  BaseSearchParams,
  BaseSearchResult,
  BaseFormInput,
  BaseUpdateInput,
  EntityStatus,
  MerchantReference,
  OutletReference
} from '../common/base';

// ============================================================================
// USER ROLES
// ============================================================================

export type UserRole = 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF';

// ============================================================================
// CORE USER INTERFACES
// ============================================================================

/**
 * Main User interface - consolidated from multiple sources
 * Combines auth/user.ts and users/user.ts definitions
 */
export interface User extends BaseEntityWithMerchant {
  // Core identity fields
  firstName: string;
  lastName: string;
  name: string; // Computed field: firstName + lastName
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date | string;
  
  // Optional outlet assignment (for outlet-level users)
  outletId?: number;
  
  // ✅ Permissions array for UI control (from login response)
  permissions?: string[]; // Array of permission strings like 'products.manage', 'orders.create', etc.
  
  // Related entities (populated when needed)
  merchant?: MerchantReference;
  outlet?: OutletReference;
}

/**
 * Authentication-specific user interface
 * Used for login/session management
 */
export interface AuthUser extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  merchantId?: number;
  outletId?: number;
  isActive: boolean;
  lastLoginAt?: Date | string;
}

// ============================================================================
// USER FORM INPUTS
// ============================================================================

/**
 * User creation input
 * Used for creating new users
 */
export interface UserCreateInput extends BaseFormInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  merchantId?: number;
  outletId?: number;
}

/**
 * User update input
 * Used for updating existing users
 */
export interface UserUpdateInput extends BaseUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

/**
 * Profile update input
 * Used for users updating their own profile
 */
export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

/**
 * User session interface
 * Used for session management
 */
export interface UserSession {
  user: AuthUser;
  token: string;
  expiresAt: Date | string;
}

/**
 * Login credentials
 * Used for authentication
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 * Used for user registration
 */
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
  merchantId?: number;
  outletId?: number;
  // Additional fields for merchant registration
  businessName?: string;
  outletName?: string;
  merchantCode?: string;
  outletCode?: string;
}

/**
 * Password reset data
 * Used for password reset functionality
 */
export interface PasswordReset {
  email: string;
  token: string;
  newPassword: string;
}

/**
 * Change password data
 * Used for changing user password
 */
export interface ChangePassword {
  currentPassword: string;
  newPassword: string;
}

// ============================================================================
// USER SEARCH AND FILTERS
// ============================================================================

/**
 * User search parameters
 * Extends base search with user-specific filters
 */
export interface UserSearchParams extends BaseSearchParams {
  role?: UserRole;
  merchantId?: number;
  outletId?: number;
  isActive?: boolean;
  status?: 'all' | 'active' | 'inactive';
  emailVerified?: boolean;
}

/**
 * User search result
 * Extends base search result with user-specific data
 */
export interface UserSearchResult extends BaseSearchResult<User> {
  users: User[]; // Alias for items for backward compatibility
}

// ============================================================================
// USER MANAGEMENT TYPES
// ============================================================================

/**
 * User data interface for management views
 * Used in user management components
 */
export interface UserData {
  users: User[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * User action type
 * Used for user management actions
 */
export type UserAction = 'create' | 'edit' | 'view' | 'delete' | 'activate' | 'deactivate';

// ============================================================================
// USER STATISTICS
// ============================================================================

/**
 * User statistics interface
 * Used for user analytics and reporting
 */
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  usersByRole: Record<UserRole, number>;
  usersByMerchant: Record<number, number>;
  usersByOutlet: Record<number, number>;
  recentLogins: number;
  newUsersThisMonth: number;
}

// ============================================================================
// USER PERMISSIONS
// ============================================================================

/**
 * User permissions interface
 * Used for role-based access control
 */
export interface UserPermissions {
  canManageUsers: boolean;
  canManageMerchants: boolean;
  canManageOutlets: boolean;
  canManageProducts: boolean;
  canManageOrders: boolean;
  canManageCustomers: boolean;
  canViewAnalytics: boolean;
  canManageSettings: boolean;
}

// ============================================================================
// USER FILTERS
// ============================================================================

/**
 * User search filter
 * Used for user search operations in API
 */
export interface UserSearchFilter {
  q?: string;           // Search query parameter
  search?: string;      // Keep for backward compatibility
  merchantId?: number;
  outletId?: number;
  role?: UserRole;
  status?: string;      // Add status filter
  isActive?: boolean;
  limit?: number;
  offset?: number;
  page?: number;        // Add page parameter for pagination
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Alias for backward compatibility
export type UserFilters = UserSearchFilter;
