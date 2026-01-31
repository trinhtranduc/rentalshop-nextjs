import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * DEBUG ENDPOINT: Check subscription status in database
 * GET /api/debug/subscription-status?merchantId=1
 * No auth required for debugging
 * 
 * Logging: Automatically handled by withApiLogging wrapper
 */
export async function GET(request: NextRequest) {
  return withApiLogging(async (request: NextRequest) => {
    try {
    const { searchParams } = new URL(request.url);
    const merchantId = parseInt(searchParams.get('merchantId') || '1');

    // Query database directly
    const subscription = await prisma.subscription.findUnique({
      where: { merchantId },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        plan: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!subscription) {
      return NextResponse.json(
        ResponseBuilder.error('SUBSCRIPTION_NOT_FOUND'),
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        merchantId: subscription.merchantId,
        merchantName: subscription.merchant.name,
        status: subscription.status,
        statusUpperCase: subscription.status.toUpperCase(),
        statusLowerCase: subscription.status.toLowerCase(),
        planName: subscription.plan.name,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        amount: subscription.amount,
        updatedAt: subscription.updatedAt
      },
      timestamp: new Date().toISOString()
    });

    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      // Use unified error handling system (uses ResponseBuilder internally)
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

