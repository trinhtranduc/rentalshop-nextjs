import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE, SUBSCRIPTION_STATUS } from '@rentalshop/constants';

/**
 * POST /api/subscriptions/[id]/resume
 * Resume subscription (reactivate cancelled or paused subscription)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const subscriptionId = parseInt(resolvedParams.id);
  
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      
      if (isNaN(subscriptionId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_SUBSCRIPTION_ID'), { status: 400 });
      }

      const existing = await db.subscriptions.findById(subscriptionId);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      // ✅ Validate: Only allow resume from CANCELLED or PAUSED status
      if (existing.status !== SUBSCRIPTION_STATUS.CANCELLED && existing.status !== SUBSCRIPTION_STATUS.PAUSED) {
        return NextResponse.json(
          ResponseBuilder.error('SUBSCRIPTION_CANNOT_RESUME'),
          { status: 400 }
        );
      }

      // Get reason from request body
      const body = await request.json().catch(() => ({}));
      const reason = body.reason || (existing.status === SUBSCRIPTION_STATUS.CANCELLED ? 'Reactivated by admin' : 'Resumed by admin');

      // Resume subscription (reactivate)
      const resumedSubscription = await db.subscriptions.update(subscriptionId, {
        status: SUBSCRIPTION_STATUS.ACTIVE,
        canceledAt: null, // Clear cancellation date when reactivating
        cancelReason: null // Clear cancellation reason when reactivating
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
          source: user.role === USER_ROLE.ADMIN ? 'admin_panel' : 'merchant_panel',
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