import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * POST /api/subscriptions/[id]/change-plan
 * Change subscription plan
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

      const body = await request.json();
      const { planId } = body;

      if (!planId) {
        return NextResponse.json({ success: false, message: 'Plan ID is required' }, { status: 400 });
      }

      const existing = await db.subscriptions.findById(subscriptionId);
      if (!existing) {
        return NextResponse.json({ success: false, message: 'Subscription not found' }, { status: API.STATUS.NOT_FOUND });
      }

      // Change subscription plan
      const updatedSubscription = await db.subscriptions.update(subscriptionId, {
        planId: planId,
        updatedAt: new Date()
      });

      return NextResponse.json({ success: true, data: updatedSubscription });
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}