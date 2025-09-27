import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

/**
 * PUT /api/settings/outlet
 * Update current user's outlet information
 * Only accessible by users with outlet access (OUTLET_ADMIN, OUTLET_STAFF) or admin
 */
export const PUT = withAuthRoles(['ADMIN', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request: NextRequest, { user, userScope }) => {
  try {
    console.log('🔍 DEBUG: Settings outlet PUT API called');
    
    console.log('🔍 DEBUG: User authenticated:', {
      id: user.id,
      role: user.role,
      merchantId: userScope.merchantId,
      outletId: user.outletId
    });

    // Check if user has outlet access
    // Admin users can access any outlet, others need specific outlet access
    if (!user.outletId && user.role !== 'ADMIN') {
      console.error('❌ DEBUG: User does not have outlet access:', {
        outletId: user.outletId,
        role: user.role
      });
      return NextResponse.json(
        { success: false, message: 'User does not have outlet access' },
        { status: API.STATUS.FORBIDDEN }
      );
    }
    
    console.log('🔍 DEBUG: User has outlet access, proceeding with update');

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
    // For admin users, we need to get the outlet ID from the request or use a default
    let outletId = user.outletId;
    
    // If admin user doesn't have outletId, we need to handle this differently
    if (!outletId && user.role === 'ADMIN') {
      console.log('🔍 DEBUG: Admin user without outletId, need to specify outlet');
      return NextResponse.json(
        { success: false, message: 'Admin users need to specify outlet ID for outlet updates' },
        { status: 400 }
      );
    }
    
    console.log('🔍 DEBUG: Updating outlet with ID:', outletId);
    
    const updatedOutlet = await prisma.outlet.update({
      where: { id: outletId },
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
        id: updatedOutlet.id,
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
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});
