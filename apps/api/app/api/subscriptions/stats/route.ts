// ============================================================================
// SUBSCRIPTION STATS API ENDPOINTS
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';

// ============================================================================
// GET /api/subscriptions/stats - Get subscription statistics
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Only ADMIN can view subscription stats
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

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
    const revenueStats = await prisma.subscriptionPayment.aggregate({
      where: {
        status: 'COMPLETED',
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
    const planIds = planDistribution.map(p => p.planId);
    const plans = await prisma.plan.findMany({
      where: { id: { in: planIds } },
      select: { id: true, publicId: true, name: true }
    });

    const planDistributionWithNames = planDistribution.map(dist => {
      const plan = plans.find(p => p.id === dist.planId);
      return {
        planId: plan?.publicId || 0,
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
      { status: 500 }
    );
  }
}
