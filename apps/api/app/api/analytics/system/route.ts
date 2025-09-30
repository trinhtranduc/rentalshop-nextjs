import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { API } from '@rentalshop/constants';

/**
 * GET /api/analytics/system - Get system analytics (Admin only)
 * REFACTORED: Now uses unified withAuth pattern
 */
export const GET = withAuthRoles(['ADMIN'])(async (request, { user, userScope }) => {
  console.log(`🔧 GET /api/analytics/system - Admin: ${user.email}`);
  
  try {

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'month';

    // Set default date range if not provided (current month)
    let dateStart: Date;
    let dateEnd: Date;
    
    if (startDate && endDate) {
      dateStart = new Date(startDate);
      dateEnd = new Date(endDate);
    } else {
      // Default to current month
      const now = new Date();
      dateStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

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
      
      // Active merchants (with recent activity in date range)
      prisma.merchant.count({ 
        where: { 
          isActive: true,
          outlets: {
            some: {
              orders: {
                some: { 
                  createdAt: { 
                    gte: dateStart,
                    lte: dateEnd
                  }
                }
              }
            }
          }
        }
      }),
      
      // New merchants in date range
      prisma.merchant.count({ 
        where: { 
          isActive: true,
          createdAt: { 
            gte: dateStart,
            lte: dateEnd
          }
        }
      }),
      
      // New merchants this year (keep for comparison)
      prisma.merchant.count({ 
        where: { 
          isActive: true,
          createdAt: { 
            gte: new Date(new Date().getFullYear(), 0, 1)
          }
        }
      }),
      
      // Revenue in date range
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: dateStart,
            lte: dateEnd
          }
        },
        _sum: { totalAmount: true }
      })
    ]);

    // Get merchant registration trends based on groupBy parameter
    const merchantTrends = [];
    
    if (groupBy === 'month') {
      // Generate trends for each month in the date range
      const current = new Date(dateStart);
      while (current <= dateEnd) {
        const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
        const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
        
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
        
        current.setMonth(current.getMonth() + 1);
      }
    } else if (groupBy === 'day') {
      // Generate trends for each day in the date range
      const current = new Date(dateStart);
      while (current <= dateEnd) {
        const dayStart = new Date(current.getFullYear(), current.getMonth(), current.getDate());
        const dayEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
        
        const newMerchants = await prisma.merchant.count({
          where: {
            isActive: true,
            createdAt: { gte: dayStart, lte: dayEnd }
          }
        });
        
        const activeMerchants = await prisma.merchant.count({
          where: {
            isActive: true,
            createdAt: { lte: dayEnd }
          }
        });
        
        merchantTrends.push({
          month: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          newMerchants,
          activeMerchants
        });
        
        current.setDate(current.getDate() + 1);
      }
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
      newMerchantsThisMonth: newMerchantsThisMonth, // New merchants in date range
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
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});
