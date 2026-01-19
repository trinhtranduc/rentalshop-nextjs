import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/affiliate/referred-merchants
 * Get list of merchants referred by a specific merchant
 * 
 * Query params:
 *   - referrerId: ID of the referrer merchant (required)
 * 
 * Authorization: ADMIN only
 */
export const GET = withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const referrerId = searchParams.get('referrerId');

    if (!referrerId) {
      return NextResponse.json(
        ResponseBuilder.validationError({
          fieldErrors: {},
          formErrors: ['referrerId is required']
        }),
        { status: 400 }
      );
    }

    const referrerIdNum = parseInt(referrerId, 10);
    if (isNaN(referrerIdNum)) {
      return NextResponse.json(
        ResponseBuilder.validationError({
          fieldErrors: {},
          formErrors: ['referrerId must be a valid number']
        }),
        { status: 400 }
      );
    }

    const referredMerchants = await db.merchants.getReferredMerchants(referrerIdNum);

    // Transform data for frontend
    const transformed = referredMerchants.map(merchant => ({
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      tenantKey: merchant.tenantKey,
      isActive: merchant.isActive,
      createdAt: merchant.createdAt?.toISOString() || null,
      subscriptionStatus: merchant.subscription?.status || 'N/A',
      subscriptionPlan: merchant.subscription?.plan?.name || 'N/A'
    }));

    return NextResponse.json(
      ResponseBuilder.success('REFERRED_MERCHANTS_FETCHED', {
        referredMerchants: transformed,
        total: transformed.length
      })
    );
  } catch (error) {
    console.error('Error fetching referred merchants:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
