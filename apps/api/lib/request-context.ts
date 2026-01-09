/**
 * Request Context Utility
 * 
 * Helps track request context and correlation IDs for logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCorrelationId, logRequest, type RequestLogData } from '@rentalshop/utils';

/**
 * Get correlation ID from request headers (set by middleware) or generate new one
 */
export function getCorrelationId(request: NextRequest): string {
  const correlationId = request.headers.get('x-correlation-id');
  if (correlationId) {
    return correlationId;
  }
  // Generate new one if not present
  const newId = generateCorrelationId();
  // Set in headers for response
  return newId;
}

/**
 * Extract user context from request headers (set by middleware)
 */
export function getUserContext(request: NextRequest): {
  userId?: number;
  merchantId?: number;
  outletId?: number;
} {
  const userId = request.headers.get('x-user-id');
  const merchantId = request.headers.get('x-merchant-id');
  const outletId = request.headers.get('x-outlet-id');

  return {
    userId: userId ? parseInt(userId, 10) : undefined,
    merchantId: merchantId ? parseInt(merchantId, 10) : undefined,
    outletId: outletId ? parseInt(outletId, 10) : undefined,
  };
}

/**
 * Get IP address from request
 */
export function getIpAddress(request: NextRequest): string | undefined {
  // Check various headers for IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // Take first IP in chain
    return forwardedFor.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return undefined;
}

/**
 * Log request and response (async, non-blocking)
 */
export async function logRequestResponse(
  request: NextRequest,
  response: NextResponse,
  startTime: number,
  requestBody?: any,
  errorMessage?: string
): Promise<void> {
  try {
    const correlationId = getCorrelationId(request);
    const userContext = getUserContext(request);
    const { pathname, searchParams } = request.nextUrl;
    
    // Parse query params
    const queryParams: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Calculate duration
    const duration = Date.now() - startTime;

    // Try to get response body if available (may not always be available)
    let responseBody: any = undefined;
    try {
      const responseClone = response.clone();
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const text = await responseClone.text();
        if (text) {
          responseBody = JSON.parse(text);
        }
      }
    } catch (e) {
      // Ignore errors reading response body
    }

    const logData: RequestLogData = {
      correlationId,
      method: request.method,
      path: pathname,
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      requestBody,
      responseBody,
      statusCode: response.status,
      duration,
      userId: userContext.userId,
      merchantId: userContext.merchantId,
      outletId: userContext.outletId,
      ipAddress: getIpAddress(request),
      userAgent: request.headers.get('user-agent') || undefined,
      errorMessage,
    };

    // Log asynchronously (fire and forget)
    await logRequest(logData);
  } catch (error) {
    // Silent failure - don't break main operations
    console.error('Failed to log request/response:', error);
  }
}
