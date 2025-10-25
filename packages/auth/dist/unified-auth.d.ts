import { NextRequest, NextResponse } from 'next/server';

declare const USER_ROLE: {
    readonly ADMIN: "ADMIN";
    readonly MERCHANT: "MERCHANT";
    readonly OUTLET_ADMIN: "OUTLET_ADMIN";
    readonly OUTLET_STAFF: "OUTLET_STAFF";
};
type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

interface AuthContext {
    user: any;
    userScope: any;
}
interface AuthOptions {
    /** Allowed roles for this route */
    roles?: UserRole[];
    /** Require active subscription (default: true for non-ADMIN users) */
    requireActiveSubscription?: boolean;
}
type AuthenticatedHandler = (request: NextRequest, context: AuthContext) => Promise<NextResponse>;
type AuthWrapper = (handler: AuthenticatedHandler) => (request: NextRequest) => Promise<NextResponse>;
/**
 * Unified authentication wrapper for all API routes
 * Replaces withUserManagementAuth, withOrderViewAuth, withProductManagementAuth, etc.
 *
 * Usage:
 * // With role check and subscription check (default)
 * export const POST = withAuthRoles(['ADMIN', 'MERCHANT'])(async (req, { user }) => {
 *   // Your route logic here
 * });
 *
 * // Without subscription check (for read-only operations)
 * export const GET = withAuthRoles(['ADMIN', 'MERCHANT'], { requireActiveSubscription: false })(async (req, { user }) => {
 *   // Read-only operation
 * });
 *
 * // Any authenticated user
 * export const GET = withAuthRoles()(async (req, { user }) => {
 *   // Any authenticated user can access
 * });
 */
declare function withAuthRoles(allowedRoles?: UserRole[], options?: {
    requireActiveSubscription?: boolean;
}): AuthWrapper;
/**
 * Admin-only routes (System-wide access)
 */
declare const withAdminAuth: AuthWrapper;
/**
 * Admin and Merchant routes (Organization-level access)
 */
declare const withMerchantAuth: AuthWrapper;
/**
 * All management roles (Admin, Merchant, Outlet Admin - excluding Outlet Staff)
 */
declare const withManagementAuth: AuthWrapper;
/**
 * Outlet-level access (Outlet Admin + Outlet Staff)
 */
declare const withOutletAuth: AuthWrapper;
/**
 * Any authenticated user (No role restrictions)
 */
declare const withAnyAuth: AuthWrapper;
/**
 * Read-only access (No subscription required)
 */
declare const withReadOnlyAuth: AuthWrapper;
/**
 * Admin + Read-only for non-admin users
 */
declare const withAdminOrReadOnlyAuth: AuthWrapper;
/**
 * Main unified auth function - replaces all other auth wrappers
 * Use this instead of withUserManagementAuth, withOrderViewAuth, etc.
 */
declare const withAuth: typeof withAuthRoles;
/**
 * Temporary aliases for backward compatibility during migration
 * TODO: Remove these after all routes are migrated
 */
declare const withUserManagementAuth: AuthWrapper;
declare const withProductManagementAuth: AuthWrapper;
declare const withOrderManagementAuth: AuthWrapper;
declare const withOrderViewAuth: AuthWrapper;
declare const withOrderCreateAuth: AuthWrapper;
declare const withProductExportAuth: AuthWrapper;
declare const withCustomerManagementAuth: AuthWrapper;

export { type AuthContext, type AuthOptions, type AuthWrapper, type AuthenticatedHandler, type UserRole, withAdminAuth, withAdminOrReadOnlyAuth, withAnyAuth, withAuth, withAuthRoles, withCustomerManagementAuth, withManagementAuth, withMerchantAuth, withOrderCreateAuth, withOrderManagementAuth, withOrderViewAuth, withOutletAuth, withProductExportAuth, withProductManagementAuth, withReadOnlyAuth, withUserManagementAuth };
