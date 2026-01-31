import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';
import { withApiLogging } from '../../../../../lib/api-logging-wrapper';

/**
 * POST /api/subscriptions/[id]/pause
 * Pause subscription
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const subscriptionId = parseInt(resolvedParams.id);
  
  return withApiLogging(
    withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
      try {
      
      if (isNaN(subscriptionId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_SUBSCRIPTION_ID'), { status: 400 });
      }

      const existing = await db.subscriptions.findById(subscriptionId);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      // Get reason from request body
      const body = await request.json().catch(() => ({}));
      const reason = body.reason || 'Paused by admin';

      // Pause subscription
      const pausedSubscription = await db.subscriptions.update(subscriptionId, {
        status: 'PAUSED'
      });

      // Log activity to database
      await db.subscriptionActivities.create({
        subscriptionId,
        type: 'subscription_paused',
        description: 'Subscription paused',
        reason,
        metadata: {
          planId: existing.planId,
          planName: existing.plan?.name,
          previousStatus: existing.status,
          newStatus: 'PAUSED',
          performedBy: {
            userId: user.userId || user.id,
            email: user.email,
            role: user.role,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
          },
          source: user.role === USER_ROLE.ADMIN ? 'admin_panel' : 'merchant_panel',
          severity: 'warning',
          category: 'billing'
        },
        performedBy: user.userId || user.id
      });

      return NextResponse.json({ 
        success: true, 
        data: pausedSubscription,
        code: 'SUBSCRIPTION_PAUSED_SUCCESS',
        message: 'Subscription paused successfully'
      });
    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
    })
  )(request);
}