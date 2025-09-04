import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';

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

    // Check if user is ADMIN (only admins can see system analytics)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions. Admin access required.' },
        { status: 403 }
      );
    }

    // Get current date for calculations
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Fetch system metrics in parallel
    const [
      totalMerchants,
      totalOutlets,
      totalUsers,
      totalProducts,
      totalCustomers,
      totalOrders,
      activeMerchants,
      newMerchantsThisMonth,
      newMerchantsThisYear,
      totalRevenue
    ] = await Promise.all([
      // Total merchants
      prisma.merchant.count({ where: { isActive: true } }),
      
      // Total outlets
      prisma.outlet.count({ where: { isActive: true } }),
      
      // Total users
      prisma.user.count({ where: { isActive: true } }),
      
      // Total products
      prisma.product.count({ where: { isActive: true } }),
      
      // Total customers
      prisma.customer.count({ where: { isActive: true } }),
      
      // Total orders
      prisma.order.count(),
      
      // Active merchants (with recent activity)
      prisma.merchant.count({ 
        where: { 
          isActive: true,
          outlets: {
            some: {
              orders: {
                some: { createdAt: { gte: startOfMonth } }
              }
            }
          }
        }
      }),
      
      // New merchants this month
      prisma.merchant.count({ 
        where: { 
          isActive: true,
          createdAt: { gte: startOfMonth }
        }
      }),
      
      // New merchants this year
      prisma.merchant.count({ 
        where: { 
          isActive: true,
          createdAt: { gte: startOfYear }
        }
      }),
      
      // Total revenue (sum of all order amounts)
      prisma.order.aggregate({
        _sum: { totalAmount: true }
      })
    ]);

    // Get merchant registration trends for the last 12 months
    const merchantTrends = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const newMerchants = await prisma.merchant.count({
        where: {
          isActive: true,
          createdAt: { gte: monthStart, lte: monthEnd }
        }
      });
      
      const activeMerchants = await prisma.merchant.count({
        where: {
          isActive: true,
          createdAt: { lte: monthEnd }
        }
      });
      
      merchantTrends.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        newMerchants,
        activeMerchants
      });
    }

    const systemMetrics = {
      totalMerchants,
      totalOutlets,
      totalUsers,
      totalProducts,
      totalCustomers,
      totalOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      activeMerchants,
      newMerchantsThisMonth,
      newMerchantsThisYear,
      merchantTrends
    };

    return NextResponse.json({
      success: true,
      data: systemMetrics
    });

  } catch (error) {
    console.error('Error fetching system analytics:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch system analytics' },
      { status: 500 }
    );
  }
}
