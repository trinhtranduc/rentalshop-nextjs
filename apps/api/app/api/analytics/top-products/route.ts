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

    // Get top rented products in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          createdAt: {
            gte: thirtyDaysAgo
          },
          status: { in: ['CONFIRMED', 'ACTIVE', 'COMPLETED'] }
        }
      },
      _count: {
        productId: true
      },
      _sum: {
        totalPrice: true
      },
      orderBy: {
        _count: {
          productId: 'desc'
        }
      },
      take: 10
    });

    // Get product details for each top product
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            rentPrice: true,
            images: true,
            category: {
              select: {
                name: true
              }
            }
          }
        });

        return {
          id: item.productId,
          name: product?.name || 'Unknown Product',
          rentPrice: product?.rentPrice || 0,
          category: product?.category?.name || 'Uncategorized',
          rentalCount: item._count.productId,
          totalRevenue: item._sum.totalPrice || 0,
          image: product?.images ? JSON.parse(product.images)[0] : null
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: topProductsWithDetails
    });

  } catch (error) {
    console.error('Error fetching top products analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch top products analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 