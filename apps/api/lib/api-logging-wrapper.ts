/**
 * API Logging Wrapper
 * 
 * Centralized logging wrapper for API routes
 * Automatically logs:
 * - API requests/responses (method, path, status, duration)
 * - Database operations (operation, model, duration)
 * - Errors with full context
 * 
 * Usage:
 *   export const GET = withApiLogging(
 *     withPermissions(['posts.view'])(async (request, { user }) => {
 *       // Your route handler - no need to add logging manually
 *       return NextResponse.json({ success: true });
 *     })
 *   );
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCorrelationId, getUserContext } from './request-context';

// Dynamic import for server-only logger (avoids client-side bundling)
let logError: any, logInfo: any, logApiRequest: any, logDatabaseOperation: any;

if (typeof window === 'undefined') {
  // Server-side only
  const loggerModule = require('@rentalshop/utils/server');
  logError = loggerModule.logError;
  logInfo = loggerModule.logInfo;
  logApiRequest = loggerModule.logApiRequest;
  logDatabaseOperation = loggerModule.logDatabaseOperation;
}

type RouteHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse;

/**
 * Wrapper to automatically log API requests, responses, and errors
 * 
 * This wrapper:
 * 1. Logs API request/response automatically
 * 2. Tracks database operations (via db wrapper hooks - if implemented)
 * 3. Logs errors with full context
 * 4. Adds correlation ID and user context
 */
export function withApiLogging(handler: RouteHandler) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    const correlationId = getCorrelationId(request);
    const userContext = getUserContext(request);
    const { pathname } = request.nextUrl;
    const method = request.method;

    let response: NextResponse;
    let errorOccurred = false;
    let errorDetails: any = null;

    try {
      // Execute the route handler
      response = await handler(request, context);
      
      // Log successful API request
      const duration = Date.now() - startTime;
      const statusCode = response.status;
      
      // Always log to console for Railway visibility (even if log level is high)
      // This ensures logs appear in Railway deployment logs
      const logMessage = `[API] ${method} ${pathname} - ${statusCode} (${duration}ms) [${correlationId}]`;
      if (statusCode >= 500) {
        console.error(logMessage, {
          userId: userContext.userId,
          merchantId: userContext.merchantId,
          outletId: userContext.outletId,
        });
      } else if (statusCode >= 400) {
        console.warn(logMessage, {
          userId: userContext.userId,
          merchantId: userContext.merchantId,
          outletId: userContext.outletId,
        });
      } else {
        console.log(logMessage, {
          userId: userContext.userId,
          merchantId: userContext.merchantId,
          outletId: userContext.outletId,
        });
      }
      
      // Also use structured logger (Pino + Axiom)
      logApiRequest(method, pathname, statusCode, duration, {
        correlationId,
        userId: userContext.userId,
        merchantId: userContext.merchantId,
        outletId: userContext.outletId,
      });

      // Log warning for slow requests (>1s)
      if (duration > 1000) {
        console.warn(`[SLOW REQUEST] ${method} ${pathname} - ${duration}ms [${correlationId}]`);
        logInfo('Slow API request detected', {
          method,
          path: pathname,
          duration,
          statusCode,
          correlationId,
        });
      }

      return response;
    } catch (error) {
      errorOccurred = true;
      errorDetails = error;

      // Always log error to console for Railway visibility
      const duration = Date.now() - startTime;
      console.error(`[API ERROR] ${method} ${pathname} - ${error instanceof Error ? error.message : String(error)} [${correlationId}]`, {
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : error,
        method,
        path: pathname,
        userId: userContext.userId,
        merchantId: userContext.merchantId,
        outletId: userContext.outletId,
        duration,
      });
      
      // Also use structured logger (Pino + Axiom)
      logError(
        `API error: ${method} ${pathname}`,
        error,
        {
          correlationId,
          method,
          path: pathname,
          userId: userContext.userId,
          merchantId: userContext.merchantId,
          outletId: userContext.outletId,
          duration,
        }
      );

      // Create error response
      response = NextResponse.json(
        {
          success: false,
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 }
      );

      // Log failed API request
      logApiRequest(method, pathname, 500, duration, {
        correlationId,
        userId: userContext.userId,
        merchantId: userContext.merchantId,
        outletId: userContext.outletId,
        error: true,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      return response;
    }
  };
}

/**
 * Helper to log database operations
 * Call this in your database wrapper functions
 * 
 * Usage in db.posts.create():
 *   const startTime = Date.now();
 *   const result = await prisma.post.create(...);
 *   logDatabaseOperation('create', 'Post', Date.now() - startTime, { postId: result.id });
 */
export { logDatabaseOperation };

/**
 * Helper to create a composite wrapper that combines auth + logging
 * 
 * Usage:
 *   export const GET = withAuthAndLogging(['posts.view'])(async (request, { user }) => {
 *     // Your route handler
 *   });
 * 
 * Note: This is a convenience wrapper. You can also use:
 *   export const GET = withApiLogging(withPermissions([...])(handler));
 */
import { withPermissions, type Permission } from '@rentalshop/auth';

export function withAuthAndLogging(permissions: Permission[]) {
  return (handler: any) => {
    const authHandler = withPermissions(permissions)(handler);
    return withApiLogging(authHandler as RouteHandler);
  };
}
