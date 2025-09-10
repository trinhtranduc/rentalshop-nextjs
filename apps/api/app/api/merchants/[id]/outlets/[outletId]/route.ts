import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; outletId: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    const merchantPublicId = parseInt(params.id);
    const outletPublicId = parseInt(params.outletId);
    
    if (isNaN(merchantPublicId) || isNaN(outletPublicId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant or outlet ID' },
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

    // Get outlet with statistics
    const outlet = await prisma.outlet.findFirst({
      where: {
        publicId: outletPublicId,
        merchantId: merchant.id
      },
      select: {
        id: true,
        publicId: true,
        name: true,
        address: true,
        description: true,
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

    if (!outlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }

    // Transform data for frontend
    const transformedOutlet = {
      id: outlet.publicId,
      name: outlet.name,
      address: outlet.address || '',
      phone: outlet.phone || '',
      description: outlet.description,
      isActive: outlet.isActive,
      isDefault: outlet.isDefault,
      createdAt: outlet.createdAt.toISOString(),
      updatedAt: outlet.updatedAt.toISOString(),
      stats: {
        totalUsers: outlet._count.users,
        totalProducts: outlet._count.products,
        totalOrders: outlet._count.orders
      }
    };

    return NextResponse.json({
      success: true,
      data: transformedOutlet
    });

  } catch (error) {
    console.error('Error fetching outlet details:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch outlet details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; outletId: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    const merchantPublicId = parseInt(params.id);
    const outletPublicId = parseInt(params.outletId);
    
    if (isNaN(merchantPublicId) || isNaN(outletPublicId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant or outlet ID' },
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

    // Get request body
    const body = await request.json();
    const { name, address, phone, description } = body;

    // Validate required fields
    if (!name || !address) {
      return NextResponse.json(
        { success: false, message: 'Name and address are required' },
        { status: 400 }
      );
    }

    // Update outlet
    const updatedOutlet = await prisma.outlet.updateMany({
      where: {
        publicId: outletPublicId,
        merchantId: merchant.id
      },
      data: {
        name,
        address,
        phone: phone || null,
        description: description || null,
        updatedAt: new Date()
      }
    });

    if (updatedOutlet.count === 0) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }

    // Get updated outlet with statistics
    const outlet = await prisma.outlet.findFirst({
      where: {
        publicId: outletPublicId,
        merchantId: merchant.id
      },
      select: {
        id: true,
        publicId: true,
        name: true,
        address: true,
        description: true,
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
    const transformedOutlet = {
      id: outlet!.publicId,
      name: outlet!.name,
      address: outlet!.address || '',
      phone: outlet!.phone || '',
      description: outlet!.description,
      isActive: outlet!.isActive,
      isDefault: outlet!.isDefault,
      createdAt: outlet!.createdAt.toISOString(),
      updatedAt: outlet!.updatedAt.toISOString(),
      stats: {
        totalUsers: outlet!._count.users,
        totalProducts: outlet!._count.products,
        totalOrders: outlet!._count.orders
      }
    };

    return NextResponse.json({
      success: true,
      data: transformedOutlet
    });

  } catch (error) {
    console.error('Error updating outlet:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update outlet' },
      { status: 500 }
    );
  }
}
