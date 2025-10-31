import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * POST /api/subscriptions/[id]/cancel
 * Cancel subscription
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
      const reason = body.reason || 'Cancelled by admin';

      // Cancel subscription
      const cancelledSubscription = await db.subscriptions.update(subscriptionId, {
        status: 'CANCELLED',
        canceledAt: new Date(),
        cancelReason: reason
      });

      // Log activity to database
      await db.subscriptionActivities.create({
        subscriptionId,
        type: 'subscription_cancelled',
        description: 'Subscription cancelled',
        reason,
        metadata: {
          planId: existing.planId,
          planName: existing.plan?.name,
          previousStatus: existing.status,
          newStatus: 'CANCELLED',
          performedBy: {
            userId: user.userId || user.id,
            email: user.email,
            role: user.role,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
          },
          source: user.role === 'ADMIN' ? 'admin_panel' : 'merchant_panel',
          severity: 'error',
          category: 'billing'
        },
        performedBy: user.userId || user.id
      });

      return NextResponse.json({ success: true, data: cancelledSubscription });
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}