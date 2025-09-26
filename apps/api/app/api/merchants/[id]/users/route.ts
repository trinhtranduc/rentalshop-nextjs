import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    const merchantPublicId = parseInt(params.id);
    if (isNaN(merchantPublicId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant ID' },
        { status: 400 }
      );
    }

    // Find the merchant by id to get the actual CUID
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantPublicId },
      select: { id: true }
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, message: 'Merchant not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') || undefined;
    const isActive = searchParams.get('isActive') || undefined;
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
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    // Add role filter
    if (role) {
      where.role = role;
    }

    // Add status filter
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
      select: {
        id: true,
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        outlet: {
          select: {
            id: true,
            id: true,
            name: true
          }
        }
      }
    });

    // Transform data for frontend
    const transformedUsers = users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      outlet: user.outlet ? {
        id: user.outlet.id,
        name: user.outlet.name
      } : null
    }));

    return NextResponse.json({
      success: true,
      data: {
        users: transformedUsers,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching merchant users:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
