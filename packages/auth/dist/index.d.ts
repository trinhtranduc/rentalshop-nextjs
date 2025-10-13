import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from './unified-auth.js';
export { AuthContext, AuthOptions, AuthWrapper, AuthenticatedHandler, withAnyAuth, withAuthRoles, withManagementAuth, withMerchantAuth } from './unified-auth.js';
export { getCurrentUserClient, isAuthenticatedWithVerification as isAuthenticatedWithVerificationClient, loginUserClient, logoutUserClient, verifyTokenWithServer as verifyTokenWithServerClient } from './client.js';
export { isAuthenticatedWithVerification as isAuthenticatedWithVerificationAdmin, verifyTokenWithServer as verifyTokenWithServerAdmin } from './admin.js';
export { AuthResponse, isAuthenticated as isAuthenticatedAdmin, isAuthenticated as isAuthenticatedClient } from '@rentalshop/utils';
import './user-CTt2xktn.js';

interface LoginCredentials {
    email: string;
    password: string;
}
interface RegisterData {
    email: string;
    password: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    role?: 'CLIENT' | 'SHOP_OWNER' | 'ADMIN';
}
interface AuthUser {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    name: string;
    role: string;
    phone?: string;
    merchantId?: number;
    outletId?: number;
    merchant?: {
        id: number;
        name: string;
        description?: string;
    };
    outlet?: {
        id: number;
        name: string;
        address?: string;
    };
}
interface AuthResponse {
    user: AuthUser;
    token: string;
}

declare const loginUser: (credentials: LoginCredentials) => Promise<AuthResponse>;
declare const registerUser: (data: RegisterData) => Promise<AuthResponse>;

declare const hashPassword: (password: string) => Promise<string>;
declare const comparePassword: (password: string, hashedPassword: string) => Promise<boolean>;

interface JWTPayload {
    userId: number;
    email: string;
    role: string;
    merchantId?: number | null;
    outletId?: number | null;
}
declare const generateToken: (payload: JWTPayload) => string;
declare const verifyToken: (token: string) => JWTPayload;
declare const verifyTokenSimple: (token: string) => Promise<{
    id: number;
    email: string;
    role: string;
    merchantId: number | null;
    outletId: number | null;
} | null>;

type Role = UserRole;
type Permission = 'system.manage' | 'system.view' | 'merchant.manage' | 'merchant.view' | 'outlet.manage' | 'outlet.view' | 'users.manage' | 'users.view' | 'products.manage' | 'products.view' | 'products.export' | 'orders.create' | 'orders.view' | 'orders.update' | 'orders.delete' | 'orders.export' | 'orders.manage' | 'customers.manage' | 'customers.view' | 'customers.export' | 'analytics.view' | 'billing.manage' | 'billing.view';
type Resource = 'system' | 'merchant' | 'outlet' | 'users' | 'products' | 'orders' | 'customers' | 'analytics' | 'billing';
interface UserScope {
    merchantId?: number;
    outletId?: number;
    canAccessSystem: boolean;
}
interface AuthorizedRequest {
    request: NextRequest;
    user: AuthUser;
    userScope: UserScope;
}
/**
 * Authenticate request and return user or error
 * This is the SINGLE authentication function used everywhere
 */
declare function authenticateRequest(request: NextRequest): Promise<{
    success: true;
    user: AuthUser;
} | {
    success: false;
    response: NextResponse;
}>;
/**
 * Get user scope for database operations
 * This is the SINGLE function that determines data access scope
 */
declare function getUserScope(user: AuthUser): UserScope;
/**
 * Check if user has specific permission
 * This is the SINGLE permission checking function
 */
declare function hasPermission(user: AuthUser, permission: Permission): boolean;
/**
 * Check if user has any of the specified permissions
 */
declare function hasAnyPermission(user: AuthUser, permissions: Permission[]): boolean;
/**
 * Check if user has all of the specified permissions
 */
declare function hasAllPermissions(user: AuthUser, permissions: Permission[]): boolean;
/**
 * Check if user can access a specific resource
 */
declare function canAccessResource(user: AuthUser, resource: Resource, action?: 'view' | 'manage'): boolean;
/**
 * Check if user has any of the specified roles
 */
declare function hasAnyRole(user: Pick<AuthUser, 'role'>, allowed: Role[]): boolean;
/**
 * Check if user has merchant-level access
 */
declare function isMerchantLevel(user: Pick<AuthUser, 'role'>): boolean;
/**
 * Check if user has outlet-level access
 */
declare function isOutletTeam(user: Pick<AuthUser, 'role'>): boolean;
/**
 * Check if user can manage other users
 */
declare function canManageUsers(user: Pick<AuthUser, 'role'>): boolean;
/**
 * Assert that user has any of the specified roles (throws error if not)
 */
declare function assertAnyRole(user: Pick<AuthUser, 'role'>, allowed: Role[]): void;
/**
 * Check if user can manage outlets
 */
declare function canManageOutlets(user: Pick<AuthUser, 'role'>): boolean;
/**
 * Check if user can manage products
 */
declare function canManageProducts(user: Pick<AuthUser, 'role'>): boolean;
/**
 * Check if user can access user management operations
 */
declare function canAccessUserManagement(user: Pick<AuthUser, 'role'>): boolean;
/**
 * Check if user can create orders
 */
declare function canCreateOrders(user: Pick<AuthUser, 'role'>): boolean;
/**
 * Check if user can view orders
 */
declare function canViewOrders(user: Pick<AuthUser, 'role'>): boolean;
/**
 * Check if user can update orders
 */
declare function canUpdateOrders(user: Pick<AuthUser, 'role'>): boolean;
/**
 * Check if user can delete orders
 * Only ADMIN, MERCHANT, and OUTLET_ADMIN can delete orders
 * OUTLET_STAFF cannot delete orders
 */
declare function canDeleteOrders(user: Pick<AuthUser, 'role'>): boolean;
/**
 * Check if user can manage orders (full CRUD operations)
 */
declare function canManageOrders(user: Pick<AuthUser, 'role'>): boolean;
/**
 * Check if user can export orders
 * Only ADMIN, MERCHANT, and OUTLET_ADMIN can export orders
 * OUTLET_STAFF cannot export orders
 */
declare function canExportOrders(user: Pick<AuthUser, 'role'>): boolean;
/**
 * Check if user can export products
 * Only ADMIN, MERCHANT, and OUTLET_ADMIN can export products
 * OUTLET_STAFF cannot export products
 */
declare function canExportProducts(user: Pick<AuthUser, 'role'>): boolean;
/**
 * Check if user can export customers
 * Only ADMIN, MERCHANT, and OUTLET_ADMIN can export customers
 * OUTLET_STAFF cannot export customers
 */
declare function canExportCustomers(user: Pick<AuthUser, 'role'>): boolean;
/**
 * Validate that a resource belongs to the user's scope
 */
declare function validateScope(userScope: UserScope, requiredScope: {
    merchantId?: number;
    outletId?: number;
}): {
    valid: boolean;
    error?: NextResponse;
};
/**
 * Create standardized error responses for authorization failures
 */
declare function createAuthError(message: string, code?: string, status?: number): NextResponse<{
    success: boolean;
    message: string;
    code: string;
    timestamp: string;
}>;
/**
 * Create standardized error responses for scope violations
 */
declare function createScopeError(message?: string): NextResponse<{
    success: boolean;
    message: string;
    code: string;
    timestamp: string;
}>;
/**
 * Create standardized error responses for permission denials
 */
declare function createPermissionError(requiredPermission: string): NextResponse<{
    success: boolean;
    message: string;
    code: string;
    timestamp: string;
}>;

interface AuthorizationOptions {
    permission?: Permission;
    resource?: Resource;
    action?: 'view' | 'manage';
    scope?: {
        merchantId?: number;
        outletId?: number;
    };
    requireActiveSubscription?: boolean;
}
/**
 * Higher-order function that wraps API route handlers with authentication only
 * Use this when you only need authentication, not authorization
 */
declare function withAuth<T = any>(handler: (request: NextRequest, user: any, ...args: any[]) => Promise<NextResponse<T>>): (request: NextRequest, ...args: any[]) => Promise<NextResponse<T>>;
/**
 * Optional authentication middleware
 * Returns user if token is valid, but doesn't fail if no token provided
 */
declare function optionalAuth(request: NextRequest): Promise<any | null>;
/**
 * Comprehensive authorization check for API routes
 * Combines authentication, permission checking, and scope validation
 */
declare function authorizeRequest(user: any, options?: AuthorizationOptions): {
    authorized: boolean;
    error?: NextResponse;
    userScope: UserScope;
};
/**
 * Higher-order function for API route handlers with authorization
 * This provides the cleanest API for route handlers
 */
declare function withAuthAndAuthz<T = any>(options: AuthorizationOptions | undefined, handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<T>>): (request: NextRequest, ...args: any[]) => Promise<NextResponse<T>>;
/**
 * Admin-only middleware
 */
declare const withAdminAuth: (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * User management middleware
 */
declare const withUserManagementAuth: (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * Product management middleware
 */
declare const withProductManagementAuth: (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * Product export middleware (only ADMIN, MERCHANT, OUTLET_ADMIN)
 */
declare const withProductExportAuth: (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * Order management middleware (full CRUD)
 */
declare const withOrderManagementAuth: (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * Order creation middleware
 */
declare const withOrderCreateAuth: (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * Order view middleware
 */
declare const withOrderViewAuth: (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * Order update middleware
 */
declare const withOrderUpdateAuth: (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * Order delete middleware (only ADMIN, MERCHANT, OUTLET_ADMIN)
 */
declare const withOrderDeleteAuth: (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * Order export middleware (only ADMIN, MERCHANT, OUTLET_ADMIN)
 */
declare const withOrderExportAuth: (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * Customer management middleware
 */
declare const withCustomerManagementAuth: (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * Customer export middleware (only ADMIN, MERCHANT, OUTLET_ADMIN)
 */
declare const withCustomerExportAuth: (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * Billing management middleware
 */
declare const withBillingManagementAuth: (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * View-only middleware (for read operations)
 */
declare const withViewAuth: (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * Middleware that requires specific merchant scope
 */
declare function withMerchantScope(merchantId: number): (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * Middleware that requires specific outlet scope
 */
declare function withOutletScope(outletId: number): (handler: (request: AuthorizedRequest, ...args: any[]) => Promise<NextResponse<unknown>>) => (request: NextRequest, ...args: any[]) => Promise<NextResponse<unknown>>;
/**
 * Extract user scope from authorized request
 * This is the SECURITY-CRITICAL function for database operations
 */
declare function getUserScopeFromRequest(authorizedRequest: AuthorizedRequest): UserScope;
/**
 * Build secure database where clause from user scope
 * This ensures data isolation at the database level
 */
declare function buildSecureWhereClause(authorizedRequest: AuthorizedRequest, additionalWhere?: any): any;
/**
 * Validate that a resource belongs to the user's scope
 * This should be called before performing operations on specific resources
 */
declare function validateResourceBelongsToUser(authorizedRequest: AuthorizedRequest, resourceType: 'merchant' | 'outlet' | 'product' | 'order' | 'customer', resourceId: number): Promise<{
    valid: boolean;
    error?: NextResponse;
}>;

export { type AuthUser, type AuthorizationOptions, type AuthorizedRequest, type JWTPayload, type LoginCredentials, type Permission, type RegisterData, type Resource, type Role, UserRole, type UserScope, assertAnyRole, authenticateRequest, authorizeRequest, buildSecureWhereClause, canAccessResource, canAccessUserManagement, canCreateOrders, canDeleteOrders, canExportCustomers, canExportOrders, canExportProducts, canManageOrders, canManageOutlets, canManageProducts, canManageUsers, canUpdateOrders, canViewOrders, comparePassword, createAuthError, createPermissionError, createScopeError, generateToken, getUserScope, getUserScopeFromRequest, hasAllPermissions, hasAnyPermission, hasAnyRole, hasPermission, hashPassword, isMerchantLevel, isOutletTeam, loginUser, optionalAuth, registerUser, validateResourceBelongsToUser, validateScope, verifyToken, verifyTokenSimple, withAdminAuth, withAuth, withAuthAndAuthz, withBillingManagementAuth, withCustomerExportAuth, withCustomerManagementAuth, withMerchantScope, withOrderCreateAuth, withOrderDeleteAuth, withOrderExportAuth, withOrderManagementAuth, withOrderUpdateAuth, withOrderViewAuth, withOutletScope, withProductExportAuth, withProductManagementAuth, withUserManagementAuth, withViewAuth };
