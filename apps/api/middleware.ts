import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from './lib/jwt-edge';

// Protected routes that require authentication
const protectedRoutes = [
  '/api/users',
  '/api/orders',
  '/api/payments',
  '/api/shops',
  '/api/products',
  '/api/customers',
  '/api/notifications',
];

// Public routes that don't require authentication
const publicRoutes = [
  '/api/auth',
  '/api/health',
  '/api/system/health',
  '/api/system/backup',
  '/api/system/integrity',
  '/api/docs',
  '/api/plans/public',
];

// Admin-only routes
const adminRoutes = [
  '/api/admin',
  '/api/plans', // Plans are admin-only (except /api/plans/public)
  // Removed /api/users since it now has proper role-based authorization
  // that allows ADMIN, MERCHANT, and OUTLET_ADMIN roles
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow OPTIONS requests to pass through for CORS preflight
  if (request.method === 'OPTIONS') {
    return NextResponse.next();
  }

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith('/api/');

  // Public routes: allow
  if (isPublicRoute || !isApiRoute) {
    return NextResponse.next();
  }

  // Auth check for all non-public API routes
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = verifyTokenSimple(token);

    // Admin-only routes (with exceptions)
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
    if (isAdminRoute && payload.role !== 'ADMIN') {
      // Exception: /api/plans/public should remain accessible to all authenticated users
      if (pathname.startsWith('/api/plans/public')) {
        // Allow access to public plans endpoint for all authenticated users
      } else {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    // Forward user context to downstream handlers via request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-email', payload.email);
    requestHeaders.set('x-user-role', payload.role);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
  }
}

export const config = {
  matcher: ['/api/:path*'],
};