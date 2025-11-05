import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/subscriptions/[id]/renew
 * Renew subscription
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export async function POST(
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
          ResponseBuilder.error('INVALID_SUBSCRIPTION_ID'),
          { status: 400 }
        );
      }

      const existing = await db.subscription.findUnique({
        where: { id: subscriptionId }
      });
      
      if (!existing) {
        return NextResponse.json(
          ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'),
          { status: API.STATUS.NOT_FOUND }
        );
      }

      // Renew subscription by extending period end date (30 days from current period end)
      const newPeriodEnd = new Date(existing.currentPeriodEnd);
      newPeriodEnd.setDate(newPeriodEnd.getDate() + 30);

      const renewedSubscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'ACTIVE',
          currentPeriodEnd: newPeriodEnd,
          updatedAt: new Date()
        },
        include: {
          payments: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return NextResponse.json(
        ResponseBuilder.success('SUBSCRIPTION_RENEWED_SUCCESS', renewedSubscription)
      );
    } catch (error) {
      console.error('Error renewing subscription:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}