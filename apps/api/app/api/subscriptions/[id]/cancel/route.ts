import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
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
        return NextResponse.json({ success: false, message: 'Invalid subscription ID' }, { status: 400 });
      }

      const existing = await db.subscriptions.findById(subscriptionId);
      if (!existing) {
        return NextResponse.json({ success: false, message: 'Subscription not found' }, { status: API.STATUS.NOT_FOUND });
      }

      // Cancel subscription
      const cancelledSubscription = await db.subscriptions.update(subscriptionId, {
        status: 'CANCELLED',
        cancelledAt: new Date()
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