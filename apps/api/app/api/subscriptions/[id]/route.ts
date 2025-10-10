import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/subscriptions/[id]
 * Get subscription by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const subscriptionId = parseInt(params.id);
      
      if (isNaN(subscriptionId)) {
        throw new Error('Invalid subscription ID');
      }

      const subscription = await db.subscriptions.findById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      return NextResponse.json({ success: true, data: subscription });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/subscriptions/[id]
 * Update subscription
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const subscriptionId = parseInt(params.id);
      
      if (isNaN(subscriptionId)) {
        throw new Error('Invalid subscription ID');
      }

      const existing = await db.subscriptions.findById(subscriptionId);
      if (!existing) {
        throw new Error('Subscription not found');
      }

      const body = await request.json();
      const updatedSubscription = await db.subscriptions.update(subscriptionId, body);

      return NextResponse.json({ success: true, data: updatedSubscription });
    } catch (error) {
      console.error('Error updating subscription:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * DELETE /api/subscriptions/[id]
 * Cancel subscription
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      const subscriptionId = parseInt(params.id);
      
      if (isNaN(subscriptionId)) {
        throw new Error('Invalid subscription ID');
      }

      const existing = await db.subscriptions.findById(subscriptionId);
      if (!existing) {
        throw new Error('Subscription not found');
      }

      // Cancel subscription by updating status
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