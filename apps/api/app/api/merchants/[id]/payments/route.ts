import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles, validateMerchantAccess } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/merchants/[id]/payments
 * Get merchant payments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  
  return withApiLogging(
    withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
      try {
        // Validate merchant access (format, exists, association, scope)
        const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
        if (!validation.valid) {
          return validation.error!;
        }
        const merchant = validation.merchant!;

        // TODO: Implement merchant payments functionality
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
  )(request);
}