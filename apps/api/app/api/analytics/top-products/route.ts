import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyTokenSimple } from '@rentalshop/auth';
import { assertAnyRole } from '@rentalshop/auth';
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

    // RBAC: ADMIN or MERCHANT
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
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
            publicId: true, // Include publicId to use as the external ID
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
          id: product?.publicId || 0, // Use publicId (number) as the external ID
          name: product?.name || 'Unknown Product',
          rentPrice: product?.rentPrice || 0,
          category: product?.category?.name || 'Uncategorized',
          rentalCount: item._count.productId,
          totalRevenue: item._sum.totalPrice || 0,
          image: product?.images ? JSON.parse(product.images)[0] : null
        };
      })
    );

    const body = JSON.stringify({ success: true, data: topProductsWithDetails });
    const etag = crypto.createHash('sha1').update(body).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' } });
    }
    return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'application/json', ETag: etag, 'Cache-Control': 'private, max-age=60' } });

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
export const runtime = 'nodejs';