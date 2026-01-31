import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/billing-cycles - Get billing cycles
 * REFACTORED: Now uses unified withAuthRoles pattern
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const GET = withApiLogging(
  withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
  try {
    // TODO: Implement billing cycle functionality when model is added to schema
    return NextResponse.json(
      ResponseBuilder.error('FEATURE_NOT_IMPLEMENTED'),
      { status: 501 }
    );
  } catch (error) {
    // Error will be automatically logged by withApiLogging wrapper
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
  })
);

/**
 * POST /api/billing-cycles - Create billing cycle
 * REFACTORED: Now uses unified withAuthRoles pattern
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const POST = withApiLogging(
  withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
  try {
    // TODO: Implement billing cycle functionality when model is added to schema
    return NextResponse.json(
      ResponseBuilder.error('FEATURE_NOT_IMPLEMENTED'),
      { status: 501 }
    );
  } catch (error) {
    // Error will be automatically logged by withApiLogging wrapper
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
  })
);
