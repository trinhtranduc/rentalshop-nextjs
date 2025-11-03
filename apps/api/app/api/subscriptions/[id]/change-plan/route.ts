import { NextRequest, NextResponse } from 'next/server';
import { getMainDb } from '@rentalshop/database';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/subscriptions/[id]/change-plan
 * Change subscription plan
 * MULTI-TENANT: Uses subdomain-based tenant DB
 * Note: Plan validation uses Main DB
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

      const body = await request.json();
      const { planId } = body;

      if (!planId) {
        return NextResponse.json(
          ResponseBuilder.error('PLAN_ID_REQUIRED', 'Plan ID is required'),
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

      // Validate plan exists in Main DB
      const mainDb = await getMainDb();
      try {
        const planResult = await mainDb.query(
          'SELECT "publicId", name, "basePrice", currency FROM "Plan" WHERE "publicId" = $1',
          [planId]
        );
        if (planResult.rows.length === 0) {
          mainDb.end();
          return NextResponse.json(
            ResponseBuilder.error('PLAN_NOT_FOUND', 'Plan not found in Main DB'),
            { status: API.STATUS.NOT_FOUND }
          );
        }
        mainDb.end();
      } catch (error) {
        console.error('Error validating plan:', error);
        mainDb.end();
        return NextResponse.json(
          ResponseBuilder.error('PLAN_VALIDATION_FAILED', 'Failed to validate plan'),
          { status: API.STATUS.INTERNAL_SERVER_ERROR }
        );
      }

      // Change subscription plan
      const updatedSubscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          planId: planId,
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
        ResponseBuilder.success('SUBSCRIPTION_PLAN_CHANGED_SUCCESS', updatedSubscription)
      );
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}