import { NextRequest, NextResponse } from 'next/server';
import { withManagementAuth } from '@rentalshop/auth';
import { getTenantDbFromRequest, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/subscriptions/[id]/pause
 * Pause subscription
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

      // Get reason from request body
      const body = await request.json().catch(() => ({}));
      const reason = body.reason || 'Paused by user';

      // Pause subscription
      const pausedSubscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'PAUSED'
        },
        include: {
          payments: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      // Create audit log (SubscriptionActivity model may not exist, use AuditLog instead)
      await db.auditLog.create({
        data: {
          entityType: 'SUBSCRIPTION',
          entityId: subscriptionId.toString(),
          action: 'SUBSCRIPTION_PAUSED',
          details: JSON.stringify({
            subscriptionId,
            planId: existing.planId,
            previousStatus: existing.status,
            newStatus: 'PAUSED',
            reason,
            performedBy: {
              userId: user.id,
              email: user.email,
              role: user.role
            }
          }),
          userId: user.id,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      });

      return NextResponse.json(
        ResponseBuilder.success('SUBSCRIPTION_PAUSED_SUCCESS', pausedSubscription)
      );
    } catch (error) {
      console.error('Error pausing subscription:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}