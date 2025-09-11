import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAdminAuth } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

export const GET = withAdminAuth(async (authorizedRequest) => {
  try {
    // User is already authenticated and authorized as ADMIN
    const { user, userScope, request } = authorizedRequest;

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
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});
