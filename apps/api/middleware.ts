import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple, type JWTPayload } from './lib/jwt-edge';
import { API } from '@rentalshop/constants';

// Protected routes that require authentication
const protectedRoutes = [
  '/api/users',
  '/api/orders',
  '/api/payments',
  '/api/shops',
  '/api/products',
  '/api/customers',
  '/api/notifications',
  '/api/subscriptions',
  '/api/settings',
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

// Note: Subscription validation routes are now defined in @rentalshop/middleware

// Admin-only routes
const adminRoutes = [
  '/api/admin',
  '/api/plans', // Plans are admin-only (except /api/plans/public)
  // Removed /api/users since it now has proper role-based authorization
  // that allows ADMIN, MERCHANT, and OUTLET_ADMIN roles
];

/**
 * Middleware for API authentication and authorization
 * 
 * Best Practices:
 * - Early return for public routes and OPTIONS requests
 * - Proper error handling without exposing sensitive information
 * - Consistent response format
 * - Security headers forwarding
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log('🔍 MIDDLEWARE: Request received:', {
    method: request.method,
    pathname,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });

  // Allow OPTIONS requests to pass through for CORS preflight
  if (request.method === 'OPTIONS') {
    console.log('🔍 MIDDLEWARE: OPTIONS request, allowing through');
    return NextResponse.next();
  }

  // Check if route is public or not an API route
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  const isApiRoute = pathname.startsWith('/api/');

  console.log('🔍 MIDDLEWARE: Route analysis:', {
    pathname,
    isApiRoute,
    isPublicRoute,
    publicRoutes: publicRoutes.filter(route => pathname.startsWith(route))
  });

  if (isPublicRoute || !isApiRoute) {
    console.log('🔍 MIDDLEWARE: Route is public or not API, allowing through');
    return NextResponse.next();
  }

  // Extract and validate authorization header
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  
  console.log('🔍 MIDDLEWARE: Authorization header check:', {
    hasAuthHeader: !!authHeader,
    authHeader: authHeader ? `${authHeader.substring(0, 20)}...` : 'NONE'
  });
  
  if (!authHeader) {
    console.log('🔍 MIDDLEWARE: No authorization header, returning 401');
    return createUnauthorizedResponse('Authorization header required');
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.log('🔍 MIDDLEWARE: Invalid authorization format, returning 401');
    return createUnauthorizedResponse('Invalid authorization format');
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  if (!token.trim()) {
    console.log('🔍 MIDDLEWARE: Empty token, returning 401');
    return createUnauthorizedResponse('Token is required');
  }

  try {
    console.log('🔍 MIDDLEWARE: Starting token verification for:', pathname);
    console.log('🔍 MIDDLEWARE: Token preview:', token.substring(0, 20) + '...');
    console.log('🔍 MIDDLEWARE: Token signature:', token.split('.')[2] ? `${token.split('.')[2].substring(0, 20)}...` : 'MISSING');
    
    // Verify token and get payload
    const payload = verifyTokenSimple(token);
    console.log('🔍 MIDDLEWARE: Token verified successfully, payload:', {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    });

    // Check admin-only routes
    const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
    if (isAdminRoute && payload.role !== 'ADMIN') {
      // Exception: /api/plans/public should remain accessible to all authenticated users
      if (!pathname.startsWith('/api/plans/public')) {
        console.log('🔍 MIDDLEWARE: Admin access required for:', pathname);
        return createForbiddenResponse('Admin access required');
      }
    }

    // Forward user context to downstream handlers via request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId.toString());
    requestHeaders.set('x-user-email', payload.email);
    requestHeaders.set('x-user-role', payload.role);

    // Note: Subscription validation is handled in the centralized authenticateRequest function
    // in packages/auth/src/core.ts, which is called by each API route
    // This ensures subscription validation happens in Node.js runtime, not Edge Runtime

    console.log('🔍 MIDDLEWARE: Headers set, forwarding to API endpoint');
    console.log('🔍 MIDDLEWARE: x-user-id:', payload.userId.toString());
    console.log('🔍 MIDDLEWARE: x-user-email:', payload.email);
    console.log('🔍 MIDDLEWARE: x-user-role:', payload.role);

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (error) {
    // Log error for debugging (but don't expose sensitive information)
    console.error('🔍 MIDDLEWARE: Authentication error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('🔍 MIDDLEWARE: Error details:', error);
    
    // Return generic error message to prevent information leakage
    return createUnauthorizedResponse('Authentication failed');
  }
}

/**
 * Create standardized unauthorized response
 */
function createUnauthorizedResponse(message: string): NextResponse {
  return NextResponse.json(
    { 
      success: false, 
      error: message,
      code: 'UNAUTHORIZED'
    }, 
    { 
      status: API.STATUS.UNAUTHORIZED,
      headers: {
        'WWW-Authenticate': 'Bearer'
      }
    }
  );
}

/**
 * Create standardized forbidden response
 */
function createForbiddenResponse(message: string): NextResponse {
  return NextResponse.json(
    { 
      success: false, 
      error: message,
      code: 'FORBIDDEN'
    }, 
    { 
      status: API.STATUS.FORBIDDEN
    }
  );
}

export const config = {
  matcher: ['/api/:path*'],
};