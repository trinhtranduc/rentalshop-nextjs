import { NextRequest, NextResponse } from 'next/server';
import { db, changePlan } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import { handleApiError } from '@rentalshop/utils';
import { API, SUBSCRIPTION_STATUS } from '@rentalshop/constants';

/**
 * GET /api/subscriptions/[id]
 * Get subscription by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const subscriptionId = parseInt(resolvedParams.id);
  
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const subscriptionId = parseInt(resolvedParams.id);
  
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
    try {
      
      if (isNaN(subscriptionId)) {
        throw new Error('Invalid subscription ID');
      }

      const existing = await db.subscriptions.findById(subscriptionId);
      if (!existing) {
        throw new Error('Subscription not found');
      }

      const body = await request.json();
      
      // If planId is being changed, use changePlan() function to ensure email notification
      if (body.planId && body.planId !== existing.planId) {
        console.log('📧 Plan ID changed in PUT /api/subscriptions/[id], using changePlan() for email notification...', {
          subscriptionId,
          oldPlanId: existing.planId,
          newPlanId: body.planId,
          billingInterval: body.billingInterval || body.interval || 'monthly'
        });
        
        // Use changePlan() for plan changes (includes email notification)
        const billingInterval = body.billingInterval || body.interval || 'monthly';
        const updatedSubscription = await changePlan(
          subscriptionId,
          body.planId,
          billingInterval as any
        );
        
        // Update other fields if provided (excluding planId and billingInterval which are handled by changePlan)
        const { planId, billingInterval: _, interval, ...otherFields } = body;
        if (Object.keys(otherFields).length > 0) {
          await db.subscriptions.update(subscriptionId, otherFields);
        }
        
        // Fetch final subscription with all updates
        const finalSubscription = await db.subscriptions.findById(subscriptionId);
        
        return NextResponse.json({ success: true, data: finalSubscription || updatedSubscription });
      } else {
        // For non-plan changes, update directly
        const updatedSubscription = await db.subscriptions.update(subscriptionId, body);
        return NextResponse.json({ success: true, data: updatedSubscription });
      }
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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  // Resolve params (handle both Promise and direct object)
  const resolvedParams = await Promise.resolve(params);
  const subscriptionId = parseInt(resolvedParams.id);
  
  return withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
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
      console.error('Error cancelling subscription:', error);
      
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}