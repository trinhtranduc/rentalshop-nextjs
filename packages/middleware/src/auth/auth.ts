/**
 * Authentication Middleware for Next.js API Routes
 * 
 * This middleware provides authentication and authorization utilities
 * for API routes with role-based access control.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple, assertAnyRole, getUserScope } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

export interface AuthMiddlewareConfig {
  // Required roles for access
  requiredRoles?: string[];
  // Whether to allow unauthenticated access
  allowUnauthenticated?: boolean;
  // Custom authorization function
  customAuth?: (user: any, request: NextRequest) => boolean;
}

/**
 * Create authentication middleware
 */
export function createAuthMiddleware(config: AuthMiddlewareConfig = {}) {
  const {
    requiredRoles = [],
    allowUnauthenticated = false,
    customAuth
  } = config;

  return async function authMiddleware(
    request: NextRequest,
    next: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    try {
      // Extract token from request
      const token = request.headers.get('authorization')?.replace('Bearer ', '');
      
      if (!token) {
        if (allowUnauthenticated) {
          return await next();
        }
        return NextResponse.json(
          { success: false, message: 'Access token required' },
          { status: 401 }
        );
      }

      // Verify token
      const user = await verifyTokenSimple(token);
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Check role-based authorization
      if (requiredRoles.length > 0) {
        try {
          assertAnyRole(user as any, requiredRoles as any);
        } catch {
          return NextResponse.json(
            { success: false, message: 'Insufficient permissions' },
            { status: API.STATUS.FORBIDDEN }
          );
        }
      }

      // Custom authorization check
      if (customAuth && !customAuth(user, request)) {
        return NextResponse.json(
          { success: false, message: 'Access denied' },
          { status: API.STATUS.FORBIDDEN }
        );
      }

      // Add user to request headers for downstream handlers
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', user.id);
      requestHeaders.set('x-user-email', user.email || '');
      requestHeaders.set('x-user-role', user.role || '');
      requestHeaders.set('x-user-merchant-id', user.merchantId?.toString() || '');
      requestHeaders.set('x-user-outlet-id', user.outletId?.toString() || '');

      // Continue with the request
      return await next();

    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { success: false, message: 'Authentication failed' },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }
  };
}

/**
 * Higher-order function to wrap API route handlers with authentication
 */
export function withAuth(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: AuthMiddlewareConfig
) {
  const authMiddleware = createAuthMiddleware(config);
  
  return async function(request: NextRequest): Promise<NextResponse> {
    return authMiddleware(request, () => handler(request));
  };
}

/**
 * Utility function to extract user from request headers
 */
export function getUserFromRequest(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  const userEmail = request.headers.get('x-user-email');
  const userRole = request.headers.get('x-user-role');
  const merchantId = request.headers.get('x-user-merchant-id');
  const outletId = request.headers.get('x-user-outlet-id');

  if (!userId) return null;

  return {
    id: userId,
    email: userEmail,
    role: userRole,
    merchantId: merchantId ? parseInt(merchantId) : undefined,
    outletId: outletId ? parseInt(outletId) : undefined,
  };
}

/**
 * Pre-configured auth middleware for different use cases
 */
export const adminAuth = createAuthMiddleware({
  requiredRoles: ['ADMIN']
});

export const merchantAuth = createAuthMiddleware({
  requiredRoles: ['ADMIN', 'MERCHANT']
});

export const outletAuth = createAuthMiddleware({
  requiredRoles: ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']
});

export const optionalAuth = createAuthMiddleware({
  allowUnauthenticated: true
});
