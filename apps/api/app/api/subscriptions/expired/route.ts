import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/subscriptions/expired
 * Get expired subscriptions
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

      const now = new Date();

      // Get expired subscriptions (past period end date)
      const expiredSubscriptions = await db.subscription.findMany({
        where: {
          currentPeriodEnd: {
            lt: now
          },
          status: {
            not: 'CANCELLED'
          }
        },
        include: {
          payments: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { currentPeriodEnd: 'desc' }
      });

      return NextResponse.json(
        ResponseBuilder.success('EXPIRED_SUBSCRIPTIONS_FETCH_SUCCESS', {
          data: expiredSubscriptions,
          total: expiredSubscriptions.length
        })
      );
    } catch (error) {
      console.error('Error fetching expired subscriptions:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}