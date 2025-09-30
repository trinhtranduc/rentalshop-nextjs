import { NextRequest, NextResponse } from 'next/server';
import { getPlanStats } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

/**
 * GET /api/plans/stats
 * Get plan statistics for admin dashboard
 */
export const GET = withAuthRoles(['ADMIN'])(async (request: NextRequest, { user, userScope }) => {
  try {

    // Get plan statistics using database function
    const stats = await getPlanStats();

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching plan stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch plan statistics' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});
