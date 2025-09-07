import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const merchantPublicId = parseInt(params.id);
    if (isNaN(merchantPublicId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    // Find the merchant by publicId to get the actual CUID
    const merchant = await prisma.merchant.findUnique({
      where: { publicId: merchantPublicId },
      select: { id: true }
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: 404 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {
      merchantId: merchant.id // Use the actual CUID
    };

    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { address: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    // Add status filter
    if (status) {
      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      }
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Get total count
    const total = await prisma.outlet.count({ where });

    // Get outlets with pagination
    const outlets = await prisma.outlet.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      select: {
        id: true,
        publicId: true,
        name: true,
        address: true,
        phone: true,
        isActive: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            products: true,
            orders: true
          }
        }
      }
    });

    // Transform data for frontend
    const transformedOutlets = outlets.map(outlet => ({
      id: outlet.publicId,
      name: outlet.name,
      address: outlet.address,
      phone: outlet.phone,
      isActive: outlet.isActive,
      isDefault: outlet.isDefault,
      createdAt: outlet.createdAt.toISOString(),
      updatedAt: outlet.updatedAt.toISOString(),
      stats: {
        totalUsers: outlet._count.users,
        totalProducts: outlet._count.products,
        totalOrders: outlet._count.orders
      }
    }));

    return NextResponse.json({
      success: true,
      data: {
        outlets: transformedOutlets,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching merchant outlets:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch outlets' },
      { status: 500 }
    );
  }
}
