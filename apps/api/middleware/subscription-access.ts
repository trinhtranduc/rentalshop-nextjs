// ============================================================================
// SUBSCRIPTION ACCESS MIDDLEWARE
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { 
  requireSubscriptionAccess, 
  requireAnyAccess,
  checkSubscriptionAccess,
  type SubscriptionAccessResult
} from '@rentalshop/auth';

// ============================================================================
// MIDDLEWARE TYPES
// ============================================================================

export type SubscriptionMiddlewareOptions = {
  requireAccess?: boolean;
  requiredAction?: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canManageUsers' | 'canManageOutlets' | 'canManageProducts' | 'canProcessOrders';
  allowReadOnly?: boolean;
  skipForAdmin?: boolean;
};

// ============================================================================
// MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Middleware to check subscription access for API routes
 */
export async function withSubscriptionAccess(
  request: NextRequest,
  options: SubscriptionMiddlewareOptions = {}
): Promise<{ 
  user: any; 
  accessResult: SubscriptionAccessResult; 
  response?: NextResponse 
}> {
  const {
    requireAccess = true,
    requiredAction = 'canView',
    allowReadOnly = false,
    skipForAdmin = true
  } = options;

  try {
    // Get auth token
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return {
        user: null,
        accessResult: {
          hasAccess: false,
          accessLevel: 'denied',
          reason: 'Access token required'
        },
        response: NextResponse.json(
          { success: false, message: 'Access token required' },
          { status: 401 }
        )
      };
    }

    // Verify token
    const user = await verifyTokenSimple(token);
    if (!user) {
      return {
        user: null,
        accessResult: {
          hasAccess: false,
          accessLevel: 'denied',
          reason: 'Invalid token'
        },
        response: NextResponse.json(
          { success: false, message: 'Invalid token' },
          { status: 401 }
        )
      };
    }

    // Skip subscription check for admin users if configured
    if (skipForAdmin && user.role === 'ADMIN') {
      return {
        user,
        accessResult: {
          hasAccess: true,
          accessLevel: 'full'
        }
      };
    }

    // Check subscription access
    const accessResult = await checkSubscriptionAccess(user);

    // If access is required and user doesn't have it
    if (requireAccess && !accessResult.hasAccess) {
      return {
        user,
        accessResult,
        response: NextResponse.json(
          { 
            success: false, 
            message: accessResult.reason || 'Access denied due to subscription status',
            accessLevel: accessResult.accessLevel,
            requiresPayment: accessResult.requiresPayment,
            upgradeRequired: accessResult.upgradeRequired
          },
          { status: 403 }
        )
      };
    }

    // Check specific action permission
    if (requireAccess && requiredAction !== 'canView') {
      try {
        await requireSubscriptionAccess(user, requiredAction);
      } catch (error) {
        return {
          user,
          accessResult,
          response: NextResponse.json(
            { 
              success: false, 
              message: error instanceof Error ? error.message : 'Insufficient permissions',
              accessLevel: accessResult.accessLevel
            },
            { status: 403 }
          )
        };
      }
    }

    // Check if read-only access is allowed
    if (!allowReadOnly && accessResult.accessLevel === 'readonly') {
      return {
        user,
        accessResult,
        response: NextResponse.json(
          { 
            success: false, 
            message: 'Read-only access not allowed for this operation',
            accessLevel: accessResult.accessLevel
          },
          { status: 403 }
        )
      };
    }

    return {
      user,
      accessResult
    };

  } catch (error) {
    console.error('Subscription access middleware error:', error);
    return {
      user: null,
      accessResult: {
        hasAccess: false,
        accessLevel: 'denied',
        reason: 'Error checking subscription access'
      },
      response: NextResponse.json(
        { success: false, message: 'Internal server error' },
        { status: 500 }
      )
    };
  }
}

/**
 * Middleware wrapper for API routes that require subscription access
 */
export function withSubscriptionRequired(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>,
  options: SubscriptionMiddlewareOptions = {}
) {
  return async (request: NextRequest, context: any) => {
    const { user, accessResult, response } = await withSubscriptionAccess(request, {
      requireAccess: true,
      ...options
    });

    if (response) {
      return response;
    }

    // Add user and access info to request context
    (request as any).user = user;
    (request as any).subscriptionAccess = accessResult;

    return handler(request, context);
  };
}

/**
 * Middleware wrapper for API routes that optionally check subscription access
 */
export function withSubscriptionOptional(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>,
  options: SubscriptionMiddlewareOptions = {}
) {
  return async (request: NextRequest, context: any) => {
    const { user, accessResult, response } = await withSubscriptionAccess(request, {
      requireAccess: false,
      ...options
    });

    if (response) {
      return response;
    }

    // Add user and access info to request context
    (request as any).user = user;
    (request as any).subscriptionAccess = accessResult;

    return handler(request, context);
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get subscription access info from request
 */
export function getSubscriptionAccess(request: NextRequest): SubscriptionAccessResult | null {
  return (request as any).subscriptionAccess || null;
}

/**
 * Get user from request
 */
export function getUser(request: NextRequest): any {
  return (request as any).user || null;
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  request: NextRequest, 
  action: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canManageUsers' | 'canManageOutlets' | 'canManageProducts' | 'canProcessOrders'
): boolean {
  const accessResult = getSubscriptionAccess(request);
  if (!accessResult) return false;

  // Admin users always have permission
  const user = getUser(request);
  if (user?.role === 'ADMIN') return true;

  // Check access level
  switch (accessResult.accessLevel) {
    case 'full':
      return true;
    case 'readonly':
      return action === 'canView';
    case 'limited':
      return action === 'canView';
    case 'denied':
    default:
      return false;
  }
}
