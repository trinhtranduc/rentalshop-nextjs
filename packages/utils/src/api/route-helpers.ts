/**
 * API Route Helpers
 * Reduces boilerplate code in API routes by providing common patterns
 */

import { z } from 'zod';
import { ResponseBuilder } from './response-builder';
import { handleApiError } from '../core/errors';
import { API, USER_ROLE } from '@rentalshop/constants';
import type { ApiRequest, ApiResponse, ValidationResult, MerchantIdResolution, AuthUser, UserScope } from './types';
import { getNextResponse } from './next-response-helper';
import { logger } from '../core/logger';

/**
 * Parse and validate query parameters
 * Returns validated data or error response
 */
export async function parseQueryParams<T extends z.ZodTypeAny>(
  request: ApiRequest,
  schema: T
): Promise<ValidationResult<z.infer<T>>> {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = schema.safeParse(Object.fromEntries(searchParams.entries()));
    
    if (!parsed.success) {
      const NextResponse = await getNextResponse();
      const result: ValidationResult<z.infer<T>> = {
        success: false as const,
        response: NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        )
      };
      return result;
    }
    
    const result: ValidationResult<z.infer<T>> = {
      success: true as const,
      data: parsed.data
    };
    return result;
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    const NextResponse = await getNextResponse();
    const result: ValidationResult<z.infer<T>> = {
      success: false as const,
      response: NextResponse.json(response, { status: statusCode })
    };
    return result;
  }
}

/**
 * Parse and validate request body
 * Returns validated data or error response
 */
export async function parseRequestBody<T extends z.ZodTypeAny>(
  request: ApiRequest,
  schema: T
): Promise<ValidationResult<z.infer<T>>> {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    
    if (!parsed.success) {
      const NextResponse = await getNextResponse();
      const result: ValidationResult<z.infer<T>> = {
        success: false as const,
        response: NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        )
      };
      return result;
    }
    
    const result: ValidationResult<z.infer<T>> = {
      success: true as const,
      data: parsed.data
    };
    return result;
  } catch (error) {
    const NextResponse = await getNextResponse();
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      const result: ValidationResult<z.infer<T>> = {
        success: false as const,
        response: NextResponse.json(
          ResponseBuilder.error('INVALID_INPUT'),
          { status: 400 }
        )
      };
      return result;
    }
    
    const { response, statusCode } = handleApiError(error);
    const result: ValidationResult<z.infer<T>> = {
      success: false as const,
      response: NextResponse.json(response, { status: statusCode })
    };
    return result;
  }
}

/**
 * Create a standardized success response
 */
export async function createSuccessResponse<T>(
  data: T,
  code: string = 'SUCCESS',
  status: number = API.STATUS.OK
): Promise<ApiResponse> {
  const NextResponse = await getNextResponse();
  return NextResponse.json(ResponseBuilder.success(code, data), { status });
}

/**
 * Create a standardized error response
 */
export async function createErrorResponse(
  code: string,
  error?: unknown,
  status: number = API.STATUS.BAD_REQUEST
): Promise<ApiResponse> {
  const NextResponse = await getNextResponse();
  return NextResponse.json(ResponseBuilder.error(code), { status });
}

/**
 * Wrap route handler with standard error handling
 * This reduces try-catch boilerplate in routes
 */
export function withErrorHandling<T extends (...args: unknown[]) => Promise<ApiResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      logger.error({ error }, 'Route handler error');
      const { response, statusCode } = handleApiError(error);
      const NextResponse = await getNextResponse();
      return NextResponse.json(response, { status: statusCode });
    }
  }) as T;
}

/**
 * Helper to create ETag response for caching
 */
export async function createETagResponse(
  data: unknown,
  request: ApiRequest,
  status: number = API.STATUS.OK
): Promise<ApiResponse> {
  const NextResponse = await getNextResponse();
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
export async function resolveMerchantId(
  user: AuthUser,
  userScope: UserScope,
  requestedMerchantId?: number
): Promise<MerchantIdResolution> {
  const NextResponse = await getNextResponse();
  
  // For ADMIN users, they can specify merchantId
  if (user.role === USER_ROLE.ADMIN && requestedMerchantId) {
    const result: MerchantIdResolution = {
      success: true as const,
      merchantId: requestedMerchantId
    };
    return result;
  }
  
  // For other roles, use their assigned merchantId
  if (userScope.merchantId) {
    // If they requested a different merchantId, deny access
    if (requestedMerchantId && requestedMerchantId !== userScope.merchantId) {
      const result: MerchantIdResolution = {
        success: false as const,
        response: NextResponse.json(
          ResponseBuilder.error('CROSS_MERCHANT_ACCESS_DENIED'),
          { status: 403 }
        )
      };
      return result;
    }
    const result: MerchantIdResolution = {
      success: true as const,
      merchantId: userScope.merchantId
    };
    return result;
  }
  
  // No merchantId available
  const result: MerchantIdResolution = {
    success: false as const,
    response: NextResponse.json(
      ResponseBuilder.error('MERCHANT_ID_REQUIRED'),
      { status: 400 }
    )
  };
  return result;
}

