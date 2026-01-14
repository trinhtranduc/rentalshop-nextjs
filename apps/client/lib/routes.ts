/**
 * Route Configuration
 * 
 * Official Next.js way to handle route categorization
 * Centralized route definitions for maintainability
 */

/**
 * Public routes that don't require authentication
 */
export const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forget-password',
  '/reset-password',
  '/email-verification',
  '/verify-email',
  '/terms',
  '/privacy',
  '/features',
] as const;

/**
 * Auth routes - authentication pages where logged-in users should be redirected
 */
export const AUTH_ROUTES = [
  '/login',
  '/register',
  '/forget-password',
] as const;

/**
 * Public informational pages - can be accessed by anyone, including unauthenticated users
 * These are different from auth routes (no redirect for logged-in users)
 */
export const PUBLIC_INFO_ROUTES = [
  '/email-verification',
  '/verify-email',
  '/terms',
  '/privacy',
] as const;

/**
 * Check if a pathname is a public route
 */
export function isPublicRoute(pathname: string): boolean {
  // Check exact matches
  if (PUBLIC_ROUTES.includes(pathname as any)) {
    return true;
  }
  
  // Check dynamic routes (e.g., /register/step-1)
  if (pathname.startsWith('/register')) {
    return true;
  }
  
  // Check public product pages (e.g., /tenant-key/products)
  // Pattern: /[tenantKey]/products
  const publicProductPagePattern = /^\/[a-z0-9\-]+\/products$/i;
  if (publicProductPagePattern.test(pathname)) {
    return true;
  }
  
  return false;
}

/**
 * Check if a pathname is an auth route
 */
export function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.includes(pathname as any) || pathname.startsWith('/register');
}

/**
 * Check if a pathname is a public info route
 */
export function isPublicInfoRoute(pathname: string): boolean {
  return PUBLIC_INFO_ROUTES.includes(pathname as any);
}

