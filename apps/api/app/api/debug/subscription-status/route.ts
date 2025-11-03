import { NextRequest, NextResponse } from 'next/server';
import { getTenantDbFromRequest } from '@rentalshop/utils';
import { ResponseBuilder } from '@rentalshop/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * DEBUG ENDPOINT: Check subscription status in database
 * GET /api/debug/subscription-status?subscriptionId=1
 * MULTI-TENANT: Uses subdomain-based tenant DB
 * Note: Requires x-subdomain header for tenant identification
 */
export async function GET(request: NextRequest) {
  try {
    const result = await getTenantDbFromRequest(request);
    
    if (!result) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required (x-subdomain header)'),
        { status: 400 }
      );
    }
    
    const { db } = result;

    const { searchParams } = new URL(request.url);
    const subscriptionId = parseInt(searchParams.get('subscriptionId') || '1');

    // Query database directly
    const subscription = await db.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            basePrice: true,
            currency: true
          }
        },
        payments: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!subscription) {
      return NextResponse.json({
        success: false,
        code: 'SUBSCRIPTION_NOT_FOUND',
        message: 'Subscription not found',
        subscriptionId
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        status: subscription.status,
        statusUpperCase: subscription.status.toUpperCase(),
        statusLowerCase: subscription.status.toLowerCase(),
        planId: subscription.planId,
        planName: subscription.plan.name,
        planPrice: subscription.plan.basePrice,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        amount: subscription.amount,
        currency: subscription.currency,
        updatedAt: subscription.updatedAt,
        paymentsCount: subscription.payments.length
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

