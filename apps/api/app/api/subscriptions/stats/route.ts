// ============================================================================
// SUBSCRIPTION STATS API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

/**
 * GET /api/subscriptions/stats - Get subscription statistics
 * Requires: ADMIN role
 */
async function handleGetSubscriptionStats(
  request: NextRequest,
  { user }: { user: any; userScope: any }
) {
  try {

    // Get subscription statistics
    const [
      total,
      active,
      trial,
      cancelled,
      pastDue,
      paused
    ] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.count({ where: { status: 'trial' } }),
      prisma.subscription.count({ where: { status: 'cancelled' } }),
      prisma.subscription.count({ where: { status: 'past_due' } }),
      prisma.subscription.count({ where: { status: 'paused' } })
    ]);

    // Get revenue statistics
    const revenueStats = await prisma.payment.aggregate({
      where: {
        status: 'COMPLETED',
        subscriptionId: { not: null }, // Only subscription payments
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) // This month
        }
      },
      _sum: {
        amount: true
      },
      _count: {
        id: true
      }
    });

    // Get plan distribution
    const planDistribution = await prisma.subscription.groupBy({
      by: ['planId'],
      _count: {
        id: true
      },
      where: {
        status: { in: ['active', 'trial'] }
      }
    });

    // Get plan names for distribution
    const planIds = planDistribution.map((p: any) => p.planId);
    const plans = await prisma.plan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, name: true }
    });

    const planDistributionWithNames = planDistribution.map((dist: any) => {
      const plan = plans.find((p: any) => p.id === dist.planId);
      return {
        planId: plan?.id || 0,
        planName: plan?.name || 'Unknown',
        count: dist._count.id
      };
    });

    // Get monthly subscription trends (last 12 months)
    const monthlyTrends = await prisma.subscription.groupBy({
      by: ['status'],
      _count: {
        id: true
      },
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear() - 1, new Date().getMonth(), 1)
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          total,
          active,
          trial,
          cancelled,
          pastDue,
          paused
        },
        revenue: {
          thisMonth: revenueStats._sum.amount || 0,
          thisMonthCount: revenueStats._count.id || 0
        },
        planDistribution: planDistributionWithNames,
        trends: monthlyTrends
      }
    });
  } catch (error) {
    console.error('Error fetching subscription stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subscription stats' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export const GET = withAuthRoles(['ADMIN'])((req, context) => 
  handleGetSubscriptionStats(req, context)
);
