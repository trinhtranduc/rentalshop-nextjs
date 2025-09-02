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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || '';
    const status = searchParams.get('status');
    const plan = searchParams.get('plan');
    const isActive = searchParams.get('isActive');
    const subscriptionStatus = searchParams.get('subscriptionStatus');
    const minRevenue = searchParams.get('minRevenue');
    const maxRevenue = searchParams.get('maxRevenue');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause for filtering
    const where: any = {};
    
    // Search across multiple fields
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Status filtering
    if (status && status !== 'all') {
      if (status === 'active') {
        where.isActive = true;
      } else if (status === 'inactive') {
        where.isActive = false;
      } else if (status === 'trial') {
        where.subscriptionStatus = 'trial';
      } else if (status === 'expired') {
        where.subscriptionStatus = 'expired';
      }
    }

    // Direct status filtering
    if (subscriptionStatus && subscriptionStatus !== 'all') {
      where.subscriptionStatus = subscriptionStatus;
    }

    // Active status filtering
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Plan filtering
    if (plan && plan !== 'all') {
      where.subscriptionPlan = plan;
    }

    // Revenue range filtering
    if (minRevenue || maxRevenue) {
      where.totalRevenue = {};
      if (minRevenue) {
        where.totalRevenue.gte = parseFloat(minRevenue);
      }
      if (maxRevenue) {
        where.totalRevenue.lte = parseFloat(maxRevenue);
      }
    }

    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Build orderBy clause
    const orderBy: any = {};
    if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'email') {
      orderBy.email = sortOrder;
    } else if (sortBy === 'subscriptionStatus') {
      orderBy.subscriptionStatus = sortOrder;
    } else if (sortBy === 'subscriptionPlan') {
      orderBy.subscriptionPlan = sortOrder;
          } else if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder;
      } else if (sortBy === 'updatedAt') {
      orderBy.updatedAt = sortOrder;
    } else if (sortBy === 'trialEndsAt') {
      orderBy.trialEndsAt = sortOrder;
    } else if (sortBy === 'lastActiveAt') {
      orderBy.lastActiveAt = sortOrder;
    } else if (sortBy === 'totalRevenue') {
      orderBy.totalRevenue = sortOrder;
    } else if (sortBy === 'isActive') {
      orderBy.isActive = sortOrder;
    } else {
      orderBy.name = 'asc'; // Default sorting
    }

    // Get total count for pagination
    const total = await prisma.merchant.count({ where });

    // Get merchants with pagination
    const merchants = await prisma.merchant.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      include: {
        _count: {
          select: {
            outlets: true,
            users: true,
            products: true
          }
        }
      }
    });

    // Transform data to match frontend expectations
    const transformedMerchants = merchants.map(merchant => ({
      id: merchant.publicId,
      name: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      isActive: merchant.isActive,
      subscriptionPlan: merchant.subscriptionPlan,
      subscriptionStatus: merchant.subscriptionStatus,
      trialEndsAt: merchant.trialEndsAt,
      outletsCount: merchant._count.outlets,
      usersCount: merchant._count.users,
      productsCount: merchant._count.products,
      totalRevenue: merchant.totalRevenue || 0,
      createdAt: merchant.createdAt,
      lastActiveAt: merchant.lastActiveAt
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasMore = offset + limit < total;

    return NextResponse.json({
      success: true,
      data: {
        merchants: transformedMerchants,
        total,
        totalPages,
        currentPage: Math.floor(offset / limit) + 1,
        limit,
        offset,
        hasMore
      }
    });

  } catch (error) {
    console.error('Error fetching merchants:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to fetch merchants', error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, email, phone, subscriptionPlan, subscriptionStatus } = body;

    // Validate required fields
    if (!name || !email || !phone || !subscriptionPlan) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingMerchant = await prisma.merchant.findUnique({
      where: { email }
    });

    if (existingMerchant) {
      return NextResponse.json(
        { success: false, message: 'Email already exists' },
        { status: 400 }
      );
    }

    // Create new merchant
    const merchant = await prisma.merchant.create({
      data: {
        name,
        email,
        phone,
        subscriptionPlan,
        subscriptionStatus: subscriptionStatus || 'trial',
        isActive: true,
        totalRevenue: 0
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Merchant created successfully',
      data: {
        id: merchant.publicId,
        name: merchant.name,
        email: merchant.email,
        phone: merchant.phone,
        isActive: merchant.isActive,
        subscriptionPlan: merchant.subscriptionPlan,
        subscriptionStatus: merchant.subscriptionStatus,
        trialEndsAt: merchant.trialEndsAt,
        outletsCount: 0,
        usersCount: 0,
        productsCount: 0,
        totalRevenue: merchant.totalRevenue,
        createdAt: merchant.createdAt,
        lastActiveAt: merchant.lastActiveAt
      }
    });

  } catch (error) {
    console.error('Error creating merchant:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create merchant', error: error.message },
      { status: 500 }
    );
  }
}
