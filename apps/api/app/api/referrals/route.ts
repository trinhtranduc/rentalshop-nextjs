import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/referrals
 * Get all referral relationships for admin tracking
 * Query params:
 *   - merchantId: Optional - filter by specific referrer merchant ID
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20)
 */
export const GET = withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = searchParams.get('merchantId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Validate page and limit
    if (page < 1) {
      return NextResponse.json(
        ResponseBuilder.validationError({
          fieldErrors: {},
          formErrors: ['Page must be greater than 0']
        }),
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        ResponseBuilder.validationError({
          fieldErrors: {},
          formErrors: ['Limit must be between 1 and 100']
        }),
        { status: 400 }
      );
    }

    // Get referrals
    const result = await db.merchants.getReferrals(
      merchantId ? parseInt(merchantId) : undefined,
      page,
      limit
    );

    // Transform data for frontend
    const referrals = result.data.map((merchant: any) => ({
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      tenantKey: merchant.tenantKey,
      referralCode: merchant.tenantKey, // Alias for clarity
      referredBy: merchant.referredBy ? {
        id: merchant.referredBy.id,
        name: merchant.referredBy.name,
        email: merchant.referredBy.email,
        tenantKey: merchant.referredBy.tenantKey,
        referralCode: merchant.referredBy.tenantKey // Alias for clarity
      } : null,
      subscriptionStatus: merchant.subscription?.status || 'N/A',
      subscriptionPlan: merchant.subscription?.plan?.name || 'N/A',
      createdAt: merchant.createdAt?.toISOString() || null,
      isActive: merchant.isActive
    }));

    return NextResponse.json(
      ResponseBuilder.success('REFERRALS_FETCHED', {
        referrals,
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore
      })
    );
  } catch (error) {
    console.error('Error fetching referrals:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

