import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/subscriptions/[id]/payments
 * Get subscription payments
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

      const subscriptionId = parseInt(params.id);
      
      if (isNaN(subscriptionId)) {
        return NextResponse.json(
          ResponseBuilder.error('INVALID_SUBSCRIPTION_ID', 'Invalid subscription ID'),
          { status: 400 }
        );
      }

      const subscription = await db.subscription.findUnique({
        where: { id: subscriptionId }
      });
      
      if (!subscription) {
        return NextResponse.json(
          ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Get query parameters
      const { searchParams } = new URL(request.url);
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
      const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

      // Get payments for this subscription
      const [payments, total] = await Promise.all([
        db.payment.findMany({
          where: { subscriptionId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        db.payment.count({ where: { subscriptionId } })
      ]);

      return NextResponse.json(
        ResponseBuilder.success('SUBSCRIPTION_PAYMENTS_FETCH_SUCCESS', {
          data: payments,
          pagination: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total
          }
        })
      );
    } catch (error) {
      console.error('Error fetching subscription payments:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}