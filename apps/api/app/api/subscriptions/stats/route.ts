import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/subscriptions/stats
 * Get subscription statistics
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function GET(request: NextRequest) {
  return withManagementAuth(async (request, { user }) => {
    try {
      const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;

      // Calculate subscription statistics
      const [total, active, cancelled, expired] = await Promise.all([
        db.subscription.count(),
        db.subscription.count({ where: { status: 'ACTIVE' } }),
        db.subscription.count({ where: { status: 'CANCELLED' } }),
        db.subscription.count({ 
          where: { 
            status: { in: ['EXPIRED', 'PAST_DUE'] }
          }
        })
      ]);

      const stats = {
        total,
        active,
        cancelled,
        expired
      };

      return NextResponse.json(
        ResponseBuilder.success('SUBSCRIPTION_STATS_FETCH_SUCCESS', stats)
      );
    } catch (error) {
      console.error('Error fetching subscription stats:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}