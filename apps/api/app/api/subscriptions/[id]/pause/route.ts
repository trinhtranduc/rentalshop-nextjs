import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * POST /api/subscriptions/[id]/pause
 * Pause subscription
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const subscriptionId = parseInt(params.id);
      
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
          source: user.role === 'ADMIN' ? 'admin_panel' : 'merchant_panel',
          severity: 'warning',
          category: 'billing'
        },
        performedBy: user.userId || user.id
      });

      return NextResponse.json({ 
        success: true, 
        data: pausedSubscription,
        code: 'SUBSCRIPTION_PAUSED_SUCCESS', message: 'Subscription paused successfully'
      });
    } catch (error) {
      console.error('Error pausing subscription:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}