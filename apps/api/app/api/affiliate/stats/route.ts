import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/affiliate/stats
 * Get affiliate statistics - merchants who referred others and their referral counts
 * 
 * Authorization: ADMIN only
 */
export const GET = withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest, { user, userScope }) => {
  try {
    const stats = await db.merchants.getAffiliateStats();

    return NextResponse.json(
      ResponseBuilder.success('AFFILIATE_STATS_FETCHED', stats)
    );
  } catch (error) {
    console.error('Error fetching affiliate stats:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
