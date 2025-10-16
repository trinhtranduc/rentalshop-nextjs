import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';

/**
 * DEBUG ENDPOINT: Check subscription status in database
 * GET /api/debug/subscription-status?merchantId=1
 * No auth required for debugging
 */
export async function GET(request: NextRequest) {
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
      return NextResponse.json({
        success: false,
        code: 'SUBSCRIPTION_NOT_FOUND', message: 'Subscription not found',
        merchantId
      });
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
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

