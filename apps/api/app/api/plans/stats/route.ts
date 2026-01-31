import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/plans/stats
 * Get plan statistics for admin dashboard
 */
export const GET = withApiLogging(
  withAuthRoles(['ADMIN'])(async (request: NextRequest, { user, userScope }) => {
  try {

    // Get plan statistics using simplified database API
    const stats = await db.plans.getStats();

    return NextResponse.json({
      success: true,
      data: stats
    });

    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);
