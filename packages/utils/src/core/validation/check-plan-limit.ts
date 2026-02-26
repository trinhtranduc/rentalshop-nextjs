// ============================================================================
// CHECK PLAN LIMIT HELPER
// ============================================================================
// DRY helper for checking plan limits in API routes

import { USER_ROLE } from '@rentalshop/constants';
import { assertPlanLimit } from './plan-limits';
import { logger } from '../logger';

/**
 * Check plan limits for a specific entity type (DRY helper)
 * Returns NextResponse if limit exceeded, null if OK or ADMIN bypass
 * 
 * Usage in API routes:
 * ```typescript
 * const planLimitError = await checkPlanLimitIfNeeded(user, merchantId, 'customers');
 * if (planLimitError) return planLimitError;
 * ```
 * 
 * @param user - Authenticated user (to check if ADMIN)
 * @param merchantId - Merchant ID to check limits for
 * @param entityType - Type of entity being created
 * @returns NextResponse if limit exceeded, null if OK
 */
export async function checkPlanLimitIfNeeded(
  user: { role: string },
  merchantId: number,
  entityType: 'outlets' | 'users' | 'products' | 'customers' | 'orders'
): Promise<Awaited<ReturnType<typeof import('next/server').NextResponse.json>> | null> {
  logger.debug({
    userRole: user.role,
    merchantId,
    entityType
  }, 'checkPlanLimitIfNeeded called');

  // ADMIN users bypass plan limit checks
  if (user.role === USER_ROLE.ADMIN) {
    logger.debug({ userRole: user.role, entityType }, 'ADMIN user: Bypassing plan limit check');
    return null;
  }

  try {
    await assertPlanLimit(merchantId, entityType);
    logger.debug({ merchantId, entityType }, 'Plan limit check passed');
    return null;
  } catch (error: unknown) {
    // FIX: Check if error is actually a plan limit error or a database error
    // If it's a database error (Prisma), don't return PLAN_LIMIT_EXCEEDED
    if (error && typeof error === 'object' && 'code' in error) {
      const errorCode = (error as { code?: string }).code;
      
      // If it's INTERNAL_SERVER_ERROR (from Prisma/database issues), re-throw it
      // Don't mask database errors as plan limit errors
      if (errorCode === 'INTERNAL_SERVER_ERROR') {
        logger.error({
          merchantId,
          entityType,
          errorMessage: (error as { message?: string }).message,
          errorName: (error as { name?: string }).name
        }, 'Database error during plan limit check (not a plan limit issue)');
        // Re-throw to let the API route handle it as a 500 error
        throw error;
      }
    }
    
    // Only return PLAN_LIMIT_EXCEEDED if it's actually a plan limit error
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'PLAN_LIMIT_EXCEEDED') {
      logger.debug({
        merchantId,
        entityType,
        errorMessage: (error as { message?: string }).message
      }, 'Plan limit exceeded');
      
      const { ResponseBuilder, getErrorStatusCode } = await import('../../api/response-builder');
      
      // Use error code only - translation system will handle the message
      // Don't pass detailed message to preserve translation
      const errorResponse = ResponseBuilder.error('PLAN_LIMIT_EXCEEDED');
      const statusCode = getErrorStatusCode({ code: 'PLAN_LIMIT_EXCEEDED' }, 422);
      
      // Log response format for debugging translation
      logger.debug({
        code: errorResponse.code,
        message: errorResponse.message,
        error: errorResponse.error,
        statusCode,
        note: 'Frontend should use code field for translation'
      }, 'Plan limit error response');
      
      // Dynamic import NextResponse to avoid build-time errors
      const { NextResponse } = await import('next/server');
      return NextResponse.json(errorResponse, { status: statusCode });
    }
    
    // For any other error, re-throw it (don't mask as plan limit error)
    logger.error({
      merchantId,
      entityType,
      error: error,
      errorMessage: (error as { message?: string })?.message,
      errorName: (error as { name?: string })?.name
    }, 'Unexpected error during plan limit check');
    throw error;
  }
}
