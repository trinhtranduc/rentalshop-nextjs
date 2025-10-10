import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

/**
 * GET /api/plans/stats
 * Get plan statistics for admin dashboard
 */
export const GET = withAuthRoles(['ADMIN'])(async (request: NextRequest, { user, userScope }) => {
  try {

    // Get plan statistics using simplified database API
    const stats = await db.plans.getStats();

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching plan stats:', error);
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
