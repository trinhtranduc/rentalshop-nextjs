import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import { API, SUBSCRIPTION_STATUS } from '@rentalshop/constants';

/**
 * GET /api/subscriptions/[id]
 * Get subscription by ID
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function GET(
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
        throw new Error('Invalid subscription ID');
      }

      const subscription = await db.subscriptions.findById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      return NextResponse.json({ success: true, data: subscription });
    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
    })
  )(request);
}

/**
 * PUT /api/subscriptions/[id]
 * Update subscription
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function PUT(
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
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
    })
  )(request);
}

/**
 * DELETE /api/subscriptions/[id]
 * Cancel subscription
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function DELETE(
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
        throw new Error('Invalid subscription ID');
      }

      const existing = await db.subscriptions.findById(subscriptionId);
      if (!existing) {
        throw new Error('Subscription not found');
      }

      // Cancel subscription by updating status
      const cancelledSubscription = await db.subscriptions.update(subscriptionId, { 
        status: SUBSCRIPTION_STATUS.CANCELLED,
        cancelledAt: new Date()
      });

      return NextResponse.json({ success: true, data: cancelledSubscription });
    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
    })
  )(request);
}