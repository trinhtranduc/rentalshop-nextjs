import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';

/**
 * PUT /api/settings/outlet
 * Update current user's outlet information
 * Only accessible by users with outlet access (OUTLET_ADMIN, OUTLET_STAFF) or admin
 */
export async function PUT(request: NextRequest) {
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

    // Check if user has outlet access
    if (!user.outletId) {
      return NextResponse.json(
        { success: false, message: 'User does not have outlet access' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, address, phone, description } = body;

    // Validate required fields
    if (!name || !address) {
      return NextResponse.json(
        { success: false, message: 'Outlet name and address are required' },
        { status: 400 }
      );
    }

    // Update outlet
    const updatedOutlet = await prisma.outlet.update({
      where: { publicId: user.outletId },
      data: {
        name,
        address,
        phone: phone || null,
        description: description || null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Outlet information updated successfully',
      data: {
        id: updatedOutlet.publicId,
        name: updatedOutlet.name,
        address: updatedOutlet.address,
        phone: updatedOutlet.phone,
        description: updatedOutlet.description,
        isActive: updatedOutlet.isActive,
        isDefault: updatedOutlet.isDefault,
        createdAt: updatedOutlet.createdAt,
        updatedAt: updatedOutlet.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating outlet information:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to update outlet information', error: errorMessage },
      { status: 500 }
    );
  }
}
