import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';

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

    // Get dashboard statistics
    const [
      totalCustomers,
      totalProducts
    ] = await Promise.all([
      // Count customers
      prisma.customer.count({
        where: { isActive: true }
      }),
      
      // Count products
      prisma.product.count({
        where: { isActive: true }
      })
    ]);

    // For now, set orders and revenue to 0 since Order model doesn't exist yet
    const totalOrders = 0;
    const totalRevenue = 0;

    return NextResponse.json({
      success: true,
      data: {
        totalCustomers,
        totalProducts,
        totalOrders,
        totalRevenue
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch dashboard statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 