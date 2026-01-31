import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/affiliate/stats
 * Get affiliate statistics - merchants who referred others and their referral counts
 * 
 * Authorization: ADMIN only
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export const GET = withApiLogging(
  withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest, { user, userScope }) => {
    try {
    const stats = await db.merchants.getAffiliateStats();

    return NextResponse.json(
      ResponseBuilder.success('AFFILIATE_STATS_FETCHED', stats)
    );
    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);
