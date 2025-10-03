// ============================================================================
// SUBSCRIPTION PAYMENT HISTORY API ENDPOINT
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getSubscriptionPaymentHistory } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { API } from '@rentalshop/constants';
import { prisma } from '@rentalshop/database';

/**
 * GET /api/subscriptions/:id/payments
 * Get payment history for a subscription
 * Auth: ADMIN (all), MERCHANT (own subscription only)
 */
async function handleGetPaymentHistory(
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const filters = {
      status: searchParams.get('status') || undefined,
      method: searchParams.get('method') || undefined,
      startDate: searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined,
      endDate: searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    // Get payment history
    const result = await getSubscriptionPaymentHistory(subscriptionId, filters);

    return NextResponse.json({
      success: true,
      data: result.payments,
      pagination: {
        total: result.total,
        hasMore: result.hasMore,
        limit: filters.limit,
        offset: filters.offset
      }
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Failed to fetch payment history' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleGetPaymentHistory(req, { ...context, params })
  );
  return authenticatedHandler(request);
}

