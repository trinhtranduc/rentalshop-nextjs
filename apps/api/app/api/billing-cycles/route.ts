import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { verifyTokenSimple } from '@rentalshop/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and authorization
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

    // Check if user is ADMIN (only admins can view all billing cycles)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get search parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'sortOrder';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { value: { contains: search } }
      ];
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Fetch billing cycles
    const [billingCycles, total] = await Promise.all([
      prisma.billingCycle.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset
      }),
      prisma.billingCycle.count({ where })
    ]);

    // Transform data for frontend
    const transformedBillingCycles = billingCycles.map(cycle => ({
      id: cycle.publicId,
      name: cycle.name,
      value: cycle.value,
      months: cycle.months,
      discount: cycle.discount,
      description: cycle.description,
      isActive: cycle.isActive,
      sortOrder: cycle.sortOrder,
      createdAt: cycle.createdAt.toISOString(),
      updatedAt: cycle.updatedAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: {
        billingCycles: transformedBillingCycles,
        total,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching billing cycles:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and authorization
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

    // Check if user is ADMIN (only admins can create billing cycles)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.value || !body.months) {
      return NextResponse.json(
        { success: false, message: 'Name, value, and months are required' },
        { status: 400 }
      );
    }

    // Check if billing cycle with same value already exists
    const existingCycle = await prisma.billingCycle.findUnique({
      where: { value: body.value }
    });

    if (existingCycle) {
      return NextResponse.json(
        { success: false, message: 'Billing cycle with this value already exists' },
        { status: 400 }
      );
    }

    // Generate next public ID
    const lastCycle = await prisma.billingCycle.findFirst({
      orderBy: { publicId: 'desc' }
    });
    const nextPublicId = (lastCycle?.publicId || 0) + 1;

    // Create billing cycle
    const billingCycle = await prisma.billingCycle.create({
      data: {
        publicId: nextPublicId,
        name: body.name,
        value: body.value,
        months: body.months,
        discount: body.discount || 0,
        description: body.description,
        isActive: body.isActive !== undefined ? body.isActive : true,
        sortOrder: body.sortOrder || 0
      }
    });

    // Transform response
    const transformedCycle = {
      id: billingCycle.publicId,
      name: billingCycle.name,
      value: billingCycle.value,
      months: billingCycle.months,
      discount: billingCycle.discount,
      description: billingCycle.description,
      isActive: billingCycle.isActive,
      sortOrder: billingCycle.sortOrder,
      createdAt: billingCycle.createdAt.toISOString(),
      updatedAt: billingCycle.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: transformedCycle
    });

  } catch (error) {
    console.error('Error creating billing cycle:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
