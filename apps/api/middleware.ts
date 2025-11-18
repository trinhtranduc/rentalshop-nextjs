import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple, type JWTPayload } from './lib/jwt-edge';
import { API } from '@rentalshop/constants';
import { detectPlatform, formatPlatformLog } from './lib/platform-detector';

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
  '/api/public', // Public product pages for merchants to share with customers
  '/api/test',
  '/api/debug', // Debug endpoints for troubleshooting
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
  
  // Detect platform from request headers
  const platformInfo = detectPlatform(request);
  
  console.log(formatPlatformLog(request, `Request received: ${request.method} ${pathname}`));
  console.log('🔍 MIDDLEWARE: Request details:', {
    method: request.method,
    pathname,
    url: request.url,
    platform: platformInfo.platform,
    deviceType: platformInfo.deviceType,
    version: platformInfo.version,
    headers: Object.fromEntries(request.headers.entries())
  });

  // ============================================================================
  // CORS CONFIGURATION - Best Practices Implementation
  // ============================================================================
  
  // Get allowed origins from environment
  const corsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  
  // Add localhost, Railway domains, and custom domains
  const allowedOrigins = [
    ...corsOrigins,
    // Local development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    // Custom domains - anyrent.shop (production)
    'https://anyrent.shop',
    'https://www.anyrent.shop', // Production website (www subdomain)
    'https://api.anyrent.shop', // Production API
    'https://admin.anyrent.shop',
    // Custom domains - anyrent.shop (development)
    'https://dev.anyrent.shop',
    'https://dev-api.anyrent.shop', // Development API
    'https://dev-admin.anyrent.shop'
  ];
  
  // Get request origin
  const requestOrigin = request.headers.get('origin') || '';
  
  // SECURITY: Exact match only - no startsWith to prevent subdomain attacks
  const isAllowedOrigin = allowedOrigins.includes(requestOrigin);
  
  // Use request origin if allowed, otherwise null (reject)
  const allowOrigin = isAllowedOrigin ? requestOrigin : 'null';
  
  console.log('🔍 MIDDLEWARE: CORS check:', {
    requestOrigin,
    allowedOrigins,
    isAllowed: isAllowedOrigin,
    allowOrigin
  });

  // Common CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version, X-CSRF-Token, X-Client-Platform, X-App-Version, X-Device-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };

  // Handle OPTIONS preflight requests
  if (request.method === 'OPTIONS') {
    console.log('🔍 MIDDLEWARE: OPTIONS preflight request');
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
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
    console.log('🔍 MIDDLEWARE: Route is public or not API, allowing through with CORS headers');
    const response = NextResponse.next();
    
    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }

  // Extract and validate authorization header
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  
  console.log('🔍 MIDDLEWARE: Authorization header check:', {
    hasAuthHeader: !!authHeader,
    authHeader: authHeader ? `${authHeader.substring(0, 20)}...` : 'NONE'
  });
  
  if (!authHeader) {
    console.log('🔍 MIDDLEWARE: No authorization header, returning 401');
    return createUnauthorizedResponse('Authorization header required', corsHeaders);
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.log('🔍 MIDDLEWARE: Invalid authorization format, returning 401');
    return createUnauthorizedResponse('Invalid authorization format', corsHeaders);
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  if (!token.trim()) {
    console.log('🔍 MIDDLEWARE: Empty token, returning 401');
    return createUnauthorizedResponse('Token is required', corsHeaders);
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
        return createForbiddenResponse('Admin access required', corsHeaders);
      }
    }

    // ============================================================================
    // PLATFORM ACCESS CONTROL - SIMPLE CHECK
    // ============================================================================
    // Basic plan only allows mobile app access
    // All other plans allow both web and mobile access
    
    if (payload.role !== 'ADMIN' && platformInfo.platform === 'web') {
      const planName = payload.planName || 'Trial'; // Default to Trial if not set
      
      // Only block Basic plan from web access; Trial and all other plans allow web access
      if (planName === 'Basic') {
        console.log('❌ MIDDLEWARE: Platform access denied:', {
          planName,
          platform: platformInfo.platform,
          message: 'Basic plan only supports mobile app'
        });
        
        return NextResponse.json(
          {
            success: false,
            error: 'PLATFORM_ACCESS_DENIED',
            message: 'Basic plan only supports mobile app. Please upgrade to Premium or Enterprise to access the web dashboard.',
            details: {
              currentPlan: planName,
              currentPlatform: platformInfo.platform,
              allowedPlatforms: ['mobile'],
              upgradeRequired: true,
              upgradeUrl: '/settings/subscription'
            }
          },
          {
            status: API.STATUS.FORBIDDEN,
            headers: {
              ...corsHeaders,
              'X-Platform-Access-Denied': 'true',
              'X-Upgrade-Required': 'true'
            }
          }
        );
      }
    }
    
    console.log('✅ MIDDLEWARE: Platform access granted:', {
      planName: payload.planName || 'Default',
      platform: platformInfo.platform
    });

    // Forward user context to downstream handlers via request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId.toString());
    requestHeaders.set('x-user-email', payload.email);
    requestHeaders.set('x-user-role', payload.role);
    
    // Forward platform info to downstream handlers
    requestHeaders.set('x-platform', platformInfo.platform);
    if (platformInfo.deviceType) {
      requestHeaders.set('x-device-type', platformInfo.deviceType);
    }
    if (platformInfo.version) {
      requestHeaders.set('x-app-version', platformInfo.version);
    }

    // Note: Subscription validation is handled in the centralized authenticateRequest function
    // in packages/auth/src/core.ts, which is called by each API route
    // This ensures subscription validation happens in Node.js runtime, not Edge Runtime

    console.log('🔍 MIDDLEWARE: Headers set, forwarding to API endpoint');
    console.log('🔍 MIDDLEWARE: x-user-id:', payload.userId.toString());
    console.log('🔍 MIDDLEWARE: x-user-email:', payload.email);
    console.log('🔍 MIDDLEWARE: x-user-role:', payload.role);

    // Forward request with CORS headers
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    
    // Add CORS headers to response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    // Log error for debugging (but don't expose sensitive information)
    console.error('🔍 MIDDLEWARE: Authentication error:', error instanceof Error ? error.message : 'Unknown error');
    console.error('🔍 MIDDLEWARE: Error details:', error);
    
    // Return generic error message to prevent information leakage
    return createUnauthorizedResponse('Authentication failed', corsHeaders);
  }
}

/**
 * Create standardized unauthorized response with CORS headers
 */
function createUnauthorizedResponse(message: string, corsHeaders: Record<string, string>): NextResponse {
  return NextResponse.json(
    { 
      success: false, 
      error: message,
      code: 'UNAUTHORIZED'
    }, 
    { 
      status: API.STATUS.UNAUTHORIZED,
      headers: {
        ...corsHeaders,
        'WWW-Authenticate': 'Bearer'
      }
    }
  );
}

/**
 * Create standardized forbidden response with CORS headers
 */
function createForbiddenResponse(message: string, corsHeaders: Record<string, string>): NextResponse {
  return NextResponse.json(
    { 
      success: false, 
      error: message,
      code: 'FORBIDDEN'
    }, 
    { 
      status: API.STATUS.FORBIDDEN,
      headers: corsHeaders
    }
  );
}

export const config = {
  matcher: ['/api/:path*'],
};