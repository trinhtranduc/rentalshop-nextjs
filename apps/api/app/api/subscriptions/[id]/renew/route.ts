// ============================================================================
// SUBSCRIPTION RENEWAL API ENDPOINT
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { renewSubscription } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { API } from '@rentalshop/constants';
import { prisma } from '@rentalshop/database';
import { z } from 'zod';

// Validation schema
const renewalSchema = z.object({
  method: z.enum(['STRIPE', 'TRANSFER'], {
    errorMap: () => ({ message: 'Payment method must be STRIPE or TRANSFER' })
  }),
  transactionId: z.string().min(1, 'Transaction ID is required'),
  reference: z.string().optional(),
  description: z.string().optional()
});

/**
 * POST /api/subscriptions/:id/renew
 * Renew subscription for another month
 * Auth: ADMIN (all), MERCHANT (own subscription only)
 */
async function handleRenewSubscription(
  request: NextRequest,
  { user, userScope, params }: { user: any; userScope: any; params: { id: string } }
) {
  try {
    const subscriptionId = parseInt(params.id);

    // Validate subscription ID
    if (isNaN(subscriptionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid subscription ID' },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // For MERCHANT role, verify they own this subscription
    if (user.role === 'MERCHANT') {
      const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId },
        select: { merchantId: true }
      });

      if (!subscription || subscription.merchantId !== userScope.merchantId) {
        return NextResponse.json(
          { success: false, message: 'Access denied' },
          { status: API.STATUS.FORBIDDEN }
        );
      }
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = renewalSchema.parse(body);

    // Process renewal
    const result = await renewSubscription(subscriptionId, validatedData);

    return NextResponse.json({
      success: true,
      data: {
        subscription: result.subscription,
        payment: result.payment,
        message: 'Subscription renewed successfully',
        nextBillingDate: result.subscription.currentPeriodEnd
      }
    });
  } catch (error) {
    console.error('Error renewing subscription:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to renew subscription' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleRenewSubscription(req, { ...context, params })
  );
  return authenticatedHandler(request);
}

