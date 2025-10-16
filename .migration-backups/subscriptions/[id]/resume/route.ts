import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * POST /api/subscriptions/[id]/resume
 * Resume subscription
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const subscriptionId = parseInt(params.id);
      
      if (isNaN(subscriptionId)) {
        return NextResponse.json({ success: false, message: 'Invalid subscription ID' }, { status: 400 });
      }

      const existing = await db.subscriptions.findById(subscriptionId);
      if (!existing) {
        return NextResponse.json({ success: false, message: 'Subscription not found' }, { status: API.STATUS.NOT_FOUND });
      }

      // Get reason from request body
      const body = await request.json().catch(() => ({}));
      const reason = body.reason || 'Resumed by admin';

      // Resume subscription
      const resumedSubscription = await db.subscriptions.update(subscriptionId, {
        status: 'ACTIVE'
      });

      // Log activity to database
      await db.subscriptionActivities.create({
        subscriptionId,
        type: 'subscription_resumed',
        description: 'Subscription resumed',
        reason,
        metadata: {
          planId: existing.planId,
          planName: existing.plan?.name,
          previousStatus: existing.status,
          newStatus: 'ACTIVE',
          performedBy: {
            userId: user.userId || user.id,
            email: user.email,
            role: user.role,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
          },
          source: user.role === 'ADMIN' ? 'admin_panel' : 'merchant_panel',
          severity: 'success',
          category: 'billing'
        },
        performedBy: user.userId || user.id
      });

      return NextResponse.json({ success: true, data: resumedSubscription });
    } catch (error) {
      console.error('Error resuming subscription:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}