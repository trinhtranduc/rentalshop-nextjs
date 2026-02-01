import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple, type JWTPayload } from './lib/jwt-edge';
import { API, USER_ROLE } from '@rentalshop/constants';
import { detectPlatform, formatPlatformLog } from './lib/platform-detector';
import { generateCorrelationId } from '@rentalshop/utils';
import { buildCorsHeaders } from './lib/cors';

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
  '/api/posts/public', // Public blog posts for landing page
  '/api/posts/slug/', // Public post by slug (for client app) - note: trailing slash for pattern matching
  '/api/posts/categories/public', // Public post categories
  '/api/posts/tags/public', // Public post tags
  '/api/test',
  '/api/debug', // Debug endpoints for troubleshooting
  '/api/sync-proxy', // Sync proxy endpoint (no authentication required)
  '/api/sync-standalone', // Sync standalone endpoint
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
 * - CORS headers always included, even on errors
 */
export async function middleware(request: NextRequest) {
  // Build CORS headers first (safe, never throws)
  const corsHeaders = buildCorsHeaders(request);
  
  // Handle OPTIONS preflight requests immediately
  // This must be done before any other processing to ensure CORS works
  // Middleware handles ALL OPTIONS requests to ensure CORS headers are always present
  if (request.method === 'OPTIONS') {
    const requestOrigin = request.headers.get('origin') || '';
    const { pathname } = request.nextUrl;
    
    // Log CORS details for debugging
    console.log('🔍 MIDDLEWARE: OPTIONS preflight request', {
      origin: requestOrigin,
      pathname,
      'Access-Control-Allow-Origin': corsHeaders['Access-Control-Allow-Origin'],
      'Access-Control-Allow-Methods': corsHeaders['Access-Control-Allow-Methods'],
      allCorsHeaders: corsHeaders
    });
    
    // Return OPTIONS response with CORS headers
    // This ensures CORS works for all routes, even if route handler doesn't have OPTIONS
    const response = new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
    
    // Double-check headers are set
    console.log('🔍 MIDDLEWARE: OPTIONS response headers:', {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
      'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
    });
    
    return response;
  }

  // Wrap all remaining middleware logic in try-catch
  // This ensures errors don't break CORS responses
  try {
    const { pathname } = request.nextUrl;

    // Generate correlation ID for request tracking
    const correlationId = generateCorrelationId();
    
    // Detect platform from request headers
    const platformInfo = detectPlatform(request);
    
    console.log(formatPlatformLog(request, `Request received: ${request.method} ${pathname} [${correlationId}]`));
    console.log('🔍 MIDDLEWARE: Request details:', {
      method: request.method,
      pathname,
      url: request.url,
      platform: platformInfo.platform,
      deviceType: platformInfo.deviceType,
      version: platformInfo.version,
    });

  // Check if route is public or not an API route
  // Special handling for /api/posts/[slug] - public endpoint for individual posts
  const isPostSlugRoute = pathname.match(/^\/api\/posts\/[^\/]+$/); // Matches /api/posts/slug but not /api/posts/123/edit
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route)) || isPostSlugRoute;
  const isApiRoute = pathname.startsWith('/api/');

  console.log('🔍 MIDDLEWARE: Route analysis:', {
    pathname,
    isApiRoute,
    isPublicRoute,
    publicRoutes: publicRoutes.filter(route => pathname.startsWith(route))
  });

  if (isPublicRoute || !isApiRoute) {
    console.log('🔍 MIDDLEWARE: Route is public or not API, allowing through with CORS headers');
    
    // Add correlation ID to headers even for public routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-correlation-id', correlationId);
    
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    
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
    if (isAdminRoute && payload.role !== USER_ROLE.ADMIN) {
      // Exception: /api/plans/public should remain accessible to all authenticated users
      if (!pathname.startsWith('/api/plans/public')) {
        console.log('🔍 MIDDLEWARE: Admin access required for:', pathname);
        const { ResponseBuilder } = await import('@rentalshop/utils');
        return NextResponse.json(
          ResponseBuilder.error('INSUFFICIENT_PERMISSIONS'),
          { 
            status: API.STATUS.FORBIDDEN,
            headers: corsHeaders
          }
        );
      }
    }

    // ============================================================================
    // PLATFORM ACCESS CONTROL - FETCH allowWebAccess FROM DB WHEN NEEDED
    // ============================================================================
    // Fetch subscription data from DB only when checking web access (keeps JWT small)
    
    if (payload.role !== USER_ROLE.ADMIN && platformInfo.platform === 'web' && payload.merchantId) {
      try {
        // Fetch subscription with plan limits from DB
        const { getSubscriptionByMerchantId } = await import('@rentalshop/database');
        const subscription = await getSubscriptionByMerchantId(payload.merchantId);
        
        if (subscription?.plan?.limits) {
          const planLimits = subscription.plan.limits as any;
          const allowWebAccess = planLimits?.allowWebAccess !== undefined 
            ? planLimits.allowWebAccess 
            : true; // Default to true if not set
          
          if (!allowWebAccess) {
            const planName = subscription.plan?.name || 'Unknown';
            console.log('❌ MIDDLEWARE: Platform access denied:', {
              planName,
              platform: platformInfo.platform,
              allowWebAccess,
              merchantId: payload.merchantId,
              message: 'Plan does not allow web access'
            });
            
            return NextResponse.json(
              {
                success: false,
                code: 'PLATFORM_ACCESS_DENIED',
                message: 'Your subscription plan does not allow web access. Please upgrade to a plan that supports web dashboard access.',
                data: {
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
      } catch (error) {
        // If error fetching subscription, allow access (fail open for better UX)
        // Log error for monitoring
        console.error('⚠️ MIDDLEWARE: Error fetching subscription for platform access check:', error);
      }
    }
    
    console.log('✅ MIDDLEWARE: Platform access granted:', {
      platform: platformInfo.platform,
      role: payload.role
    });

    // Forward user context to downstream handlers via request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-correlation-id', correlationId);
    requestHeaders.set('x-user-id', payload.userId.toString());
    requestHeaders.set('x-user-email', payload.email);
    requestHeaders.set('x-user-role', payload.role);
    
    // Forward merchant/outlet context if available
    if (payload.merchantId) {
      requestHeaders.set('x-merchant-id', payload.merchantId.toString());
    }
    if (payload.outletId) {
      requestHeaders.set('x-outlet-id', payload.outletId.toString());
    }
    
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
    console.error('❌ MIDDLEWARE: Error processing request:', error instanceof Error ? error.message : 'Unknown error');
    console.error('❌ MIDDLEWARE: Error details:', error);
    
    // Always return a response with CORS headers, even on error
    // This ensures CORS preflight requests always work
    const pathname = request.nextUrl.pathname;
    
    // If it's a public route, allow through with CORS headers
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    if (isPublicRoute) {
      const response = NextResponse.next({ 
        request: { headers: request.headers } 
      });
      // Add CORS headers to response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }
    
    // For protected routes, return unauthorized with CORS headers
    return createUnauthorizedResponse('Authentication failed', corsHeaders);
  }
}

/**
 * Create standardized unauthorized response with CORS headers
 * Uses ResponseBuilder format: { success: false, code: "...", message: "..." }
 */
function createUnauthorizedResponse(message: string, corsHeaders: Record<string, string>): NextResponse {
  return NextResponse.json(
    { 
      success: false, 
      code: 'UNAUTHORIZED',
      message: message
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
 * Uses ResponseBuilder format: { success: false, code: "...", message: "..." }
 */
function createForbiddenResponse(message: string, corsHeaders: Record<string, string>): NextResponse {
  return NextResponse.json(
    { 
      success: false, 
      code: 'FORBIDDEN',
      message: message
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