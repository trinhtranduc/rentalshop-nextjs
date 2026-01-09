/**
 * Route Wrapper Utility
 * 
 * Wraps API route handlers to automatically log requests and responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { logRequestResponse } from './request-context';

type RouteHandler = (
  request: NextRequest,
  context?: any
) => Promise<NextResponse> | NextResponse;

/**
 * Wrapper function to automatically log requests and responses
 * 
 * Usage:
 * export const GET = withRequestLogging(async (request) => {
 *   // Your route handler code
 *   return NextResponse.json({ success: true });
 * });
 */
export function withRequestLogging(handler: RouteHandler) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now();
    let requestBody: any = undefined;
    let response: NextResponse;
    let errorMessage: string | undefined = undefined;

    try {
      // Try to read request body if available (only for POST, PUT, PATCH)
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const clonedRequest = request.clone();
          const contentType = clonedRequest.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            requestBody = await clonedRequest.json();
          }
        } catch (e) {
          // Ignore errors reading request body
        }
      }

      // Execute the route handler
      response = await handler(request, context);
    } catch (error) {
      // Capture error message
      errorMessage = error instanceof Error ? error.message : String(error);
      
      // Create error response
      response = NextResponse.json(
        {
          success: false,
          code: 'INTERNAL_ERROR',
          message: errorMessage,
        },
        { status: 500 }
      );
    }

    // Log request/response asynchronously (non-blocking)
    logRequestResponse(request, response, startTime, requestBody, errorMessage).catch(
      (error) => {
        console.error('Failed to log request:', error);
      }
    );

    return response;
  };
}
