// ============================================================================
// SUBSCRIPTION MIDDLEWARE FOR API ROUTES
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { validateSubscriptionAccess } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';
import type { AuthUser } from '@rentalshop/types';

// ============================================================================
// ROUTE CONFIGURATION
// ============================================================================

// Routes that require subscription validation
export const subscriptionRequiredRoutes = [
  '/api/orders',
  '/api/products', 
  '/api/customers',
  '/api/payments',
  '/api/notifications',
  '/api/settings'
];

// Routes that don't require subscription validation (admin/system routes)
export const subscriptionExemptRoutes = [
  '/api/auth',
  '/api/health',
  '/api/system',
  '/api/plans',
  '/api/subscriptions',
  '/api/users' // User management doesn't require subscription
];

// ============================================================================
// SUBSCRIPTION VALIDATION FUNCTIONS
// ============================================================================

/**
 * Check if a route requires subscription validation
 */
export function requiresSubscriptionValidation(pathname: string): boolean {
  const requiresSubscription = subscriptionRequiredRoutes.some(route => pathname.startsWith(route));
  const isSubscriptionExempt = subscriptionExemptRoutes.some(route => pathname.startsWith(route));
  
  return requiresSubscription && !isSubscriptionExempt;
}

/**
 * Validate subscription access for API routes
 * This function should be called at the beginning of each protected API route
 */
export async function validateSubscriptionForRoute(
  user: AuthUser,
  pathname: string
): Promise<{ isValid: boolean; response?: NextResponse }> {
  // Check if this route requires subscription validation
  if (!requiresSubscriptionValidation(pathname)) {
    return { isValid: true };
  }

  console.log('🔍 SUBSCRIPTION MIDDLEWARE: Validating subscription for:', pathname);
  console.log('🔍 SUBSCRIPTION MIDDLEWARE: User:', {
    id: user.id,
    email: user.email,
    role: user.role,
    merchantId: user.merchantId
  });

  try {
    // Validate subscription access
    const subscriptionResult = await validateSubscriptionAccess(user, {
      requireActiveSubscription: true,
      allowedStatuses: ['active'],
      checkMerchantStatus: true,
      checkSubscriptionStatus: true,
      autoUpdateExpired: true
    });

    if (!subscriptionResult.isValid) {
      console.log('🔍 SUBSCRIPTION MIDDLEWARE: Validation failed:', subscriptionResult.error);
      
      const errorResponse = NextResponse.json(
        { 
          success: false, 
          message: subscriptionResult.error,
          error: 'SUBSCRIPTION_ERROR',
          subscriptionStatus: subscriptionResult.subscription?.status,
          merchantStatus: subscriptionResult.merchant?.subscriptionStatus,
          isExpired: subscriptionResult.isExpired,
          needsStatusUpdate: subscriptionResult.needsStatusUpdate
        },
        { status: subscriptionResult.statusCode || API.STATUS.FORBIDDEN }
      );

      return { isValid: false, response: errorResponse };
    }

    console.log('🔍 SUBSCRIPTION MIDDLEWARE: Validation passed');
    return { isValid: true };

  } catch (error) {
    console.error('🔍 SUBSCRIPTION MIDDLEWARE: Validation error:', error);
    
    const errorResponse = NextResponse.json(
      { 
        success: false, 
        message: 'Failed to validate subscription',
        error: 'SUBSCRIPTION_VALIDATION_ERROR'
      },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );

    return { isValid: false, response: errorResponse };
  }
}

/**
 * Higher-order function to wrap API route handlers with subscription validation
 */
export function withSubscriptionValidation<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const pathname = request.nextUrl.pathname;
    
    // Check if subscription validation is required
    if (!requiresSubscriptionValidation(pathname)) {
      return handler(request, ...args);
    }

    // Get user from request headers (set by main middleware)
    const userId = request.headers.get('x-user-id');
    const userEmail = request.headers.get('x-user-email');
    const userRole = request.headers.get('x-user-role');

    if (!userId || !userEmail || !userRole) {
      return NextResponse.json(
        { success: false, code: 'USER_INFO_NOT_FOUND', message: 'User information not found in request' },
        { status: API.STATUS.UNAUTHORIZED }
      );
    }

    // Create minimal user object for validation
    // Note: This is a simplified approach. In production, you might want to
    // fetch full user data from database or include more fields in JWT
    const user: AuthUser = {
      id: parseInt(userId),
      email: userEmail,
      name: '', // Will be filled by subscription validation if needed
      role: userRole as any,
      merchantId: undefined, // Will be fetched during validation
      outletId: undefined,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate subscription
    const validation = await validateSubscriptionForRoute(user, pathname);
    if (!validation.isValid) {
      return validation.response!;
    }

    // Call the original handler
    return handler(request, ...args);
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  requiresSubscriptionValidation,
  validateSubscriptionForRoute,
  withSubscriptionValidation,
  subscriptionRequiredRoutes,
  subscriptionExemptRoutes
};
