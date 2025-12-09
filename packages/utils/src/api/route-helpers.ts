/**
 * API Route Helpers
 * Reduces boilerplate code in API routes by providing common patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ResponseBuilder } from './response-builder';
import { handleApiError } from '../core/errors';
import { API } from '@rentalshop/constants';

/**
 * Parse and validate query parameters
 * Returns validated data or error response
 */
export function parseQueryParams<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): { success: true; data: z.infer<T> } | { success: false; response: NextResponse } {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = schema.safeParse(Object.fromEntries(searchParams.entries()));
    
    if (!parsed.success) {
      return {
        success: false,
        response: NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        )
      };
    }
    
    return { success: true, data: parsed.data };
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    return {
      success: false,
      response: NextResponse.json(response, { status: statusCode })
    };
  }
}

/**
 * Parse and validate request body
 * Returns validated data or error response
 */
export async function parseRequestBody<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T
): Promise<{ success: true; data: z.infer<T> } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    
    if (!parsed.success) {
      return {
        success: false,
        response: NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        )
      };
    }
    
    return { success: true, data: parsed.data };
  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return {
        success: false,
        response: NextResponse.json(
          ResponseBuilder.error('INVALID_INPUT'),
          { status: 400 }
        )
      };
    }
    
    const { response, statusCode } = handleApiError(error);
    return {
      success: false,
      response: NextResponse.json(response, { status: statusCode })
    };
  }
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  code: string = 'SUCCESS',
  status: number = API.STATUS.OK
): NextResponse {
  return NextResponse.json(ResponseBuilder.success(code, data), { status });
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: string,
  error?: any,
  status: number = API.STATUS.BAD_REQUEST
): NextResponse {
  return NextResponse.json(ResponseBuilder.error(code), { status });
}

/**
 * Wrap route handler with standard error handling
 * This reduces try-catch boilerplate in routes
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('Route handler error:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }) as T;
}

/**
 * Helper to create ETag response for caching
 */
export function createETagResponse(
  data: any,
  request: NextRequest,
  status: number = API.STATUS.OK
): NextResponse {
  const crypto = require('crypto');
  const bodyString = JSON.stringify(data);
  const etag = crypto.createHash('sha1').update(bodyString).digest('hex');
  const ifNoneMatch = request.headers.get('if-none-match');

  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': 'private, max-age=5' }
    });
  }

  return new NextResponse(bodyString, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ETag: etag,
      'Cache-Control': 'private, max-age=5'
    }
  });
}

/**
 * Helper to check if user can access merchant data
 * Returns merchantId to use or error response
 */
export function resolveMerchantId(
  user: any,
  userScope: any,
  requestedMerchantId?: number
): { success: true; merchantId: number } | { success: false; response: NextResponse } {
  const { USER_ROLE } = require('@rentalshop/constants');
  
  // For ADMIN users, they can specify merchantId
  if (user.role === USER_ROLE.ADMIN && requestedMerchantId) {
    return { success: true, merchantId: requestedMerchantId };
  }
  
  // For other roles, use their assigned merchantId
  if (userScope.merchantId) {
    // If they requested a different merchantId, deny access
    if (requestedMerchantId && requestedMerchantId !== userScope.merchantId) {
      return {
        success: false,
        response: NextResponse.json(
          ResponseBuilder.error('CROSS_MERCHANT_ACCESS_DENIED'),
          { status: 403 }
        )
      };
    }
    return { success: true, merchantId: userScope.merchantId };
  }
  
  // No merchantId available
  return {
    success: false,
    response: NextResponse.json(
      ResponseBuilder.error('MERCHANT_ID_REQUIRED'),
      { status: 400 }
    )
  };
}

