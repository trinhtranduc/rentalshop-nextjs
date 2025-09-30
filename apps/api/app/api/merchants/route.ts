import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
// Force TypeScript refresh - address field added
import {API} from '@rentalshop/constants';

export const GET = withAuthRoles(['ADMIN'])(async (request: NextRequest, { user }) => {
  try {

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
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { description: { contains: search } }
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
      where.planId = plan;
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
    } else if (sortBy === 'planId') {
      orderBy.planId = sortOrder;
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
        },
        // No need to fetch outlet address since merchant has its own address
      }
    });

    // Transform data to match frontend expectations
    const transformedMerchants = merchants.map((merchant: any) => ({
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      phone: merchant.phone,
      address: merchant.address,
      city: merchant.city,
      state: merchant.state,
      zipCode: merchant.zipCode,
      country: merchant.country,
      businessType: merchant.businessType,
      taxId: merchant.taxId,
      website: merchant.website,
      description: merchant.description,
      isActive: merchant.isActive,
      planId: merchant.planId,
      subscriptionStatus: merchant.subscriptionStatus,
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
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

export const POST = withAuthRoles(['ADMIN'])(async (request: NextRequest, { user }) => {
  try {

    const body = await request.json();
    const { name, email, phone, address, planId, subscriptionStatus } = body;

    // Validate required fields
    if (!name || !email || !phone || !planId) {
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
    // Generate id
    const lastMerchant = await prisma.merchant.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true }
    });
    const nextPublicId = (lastMerchant?.id || 0) + 1;

    const merchant = await prisma.merchant.create({
      data: {
        id: nextPublicId,
        name,
        email,
        phone,
        address,
        planId,
        subscriptionStatus: subscriptionStatus || 'trial',
        isActive: true,
        totalRevenue: 0
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Merchant created successfully',
      data: {
        id: merchant.id,
        name: merchant.name,
        email: merchant.email,
        phone: merchant.phone,
        isActive: merchant.isActive,
        planId: merchant.planId,
        subscriptionStatus: merchant.subscriptionStatus,
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
      { success: false, message: 'Failed to create merchant', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});
