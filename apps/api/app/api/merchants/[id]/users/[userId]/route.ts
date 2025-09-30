import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

async function handleGetUser(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string; userId: string }
) {
  try {
    const merchantPublicId = parseInt(params.id);
    const userPublicId = parseInt(params.userId);
    
    if (isNaN(merchantPublicId) || isNaN(userPublicId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant or user ID' },
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

    // Get user details
    const userDetails = await prisma.user.findFirst({
      where: {
        id: userPublicId,
        merchantId: merchant.id
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        merchant: {
          select: {
            id: true,
            name: true
          }
        },
        outlet: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    if (!userDetails) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Get all outlets for this merchant (for role assignment)
    const outlets = await prisma.outlet.findMany({
      where: { merchantId: merchant.id },
      select: {
        id: true,
        name: true,
        address: true
      }
    });

    // Transform data for frontend
    const transformedUser = {
      id: userDetails.id,
      firstName: userDetails.firstName,
      lastName: userDetails.lastName,
      name: `${userDetails.firstName} ${userDetails.lastName}`,
      email: userDetails.email,
      phone: userDetails.phone || '',
      role: userDetails.role,
      isActive: userDetails.isActive,
      emailVerified: false, // Default value since field doesn't exist
      lastLoginAt: undefined, // Default value since field doesn't exist
      createdAt: userDetails.createdAt.toISOString(),
      updatedAt: userDetails.updatedAt.toISOString(),
      merchant: userDetails.merchant ? {
        id: userDetails.merchant.id,
        name: userDetails.merchant.name
      } : null,
      outlet: userDetails.outlet ? {
        id: userDetails.outlet.id,
        name: userDetails.outlet.name,
        address: userDetails.outlet.address
      } : null
    };

    const transformedOutlets = outlets.map(outlet => ({
      id: outlet.id,
      name: outlet.name,
      address: outlet.address || ''
    }));

    return NextResponse.json({
      success: true,
      data: {
        user: transformedUser,
        outlets: transformedOutlets
      }
    });

  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch user details' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

async function handleUpdateUser(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string; userId: string }
) {
  try {
    const merchantPublicId = parseInt(params.id);
    const userPublicId = parseInt(params.userId);
    
    if (isNaN(merchantPublicId) || isNaN(userPublicId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant or user ID' },
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

    // Get request body
    const body = await request.json();
    const { firstName, lastName, phone, role, outletId, isActive } = body;
    // Email field is disabled - users cannot change their email address

    // Validate required fields
    if (!firstName || !lastName) {
      return NextResponse.json(
        { success: false, message: 'First name and last name are required' },
        { status: 400 }
      );
    }

    // Find outlet CUID if outletId is provided
    let outletCuid = null;
    if (outletId) {
      const outlet = await prisma.outlet.findFirst({
        where: { 
          id: parseInt(outletId),
          merchantId: merchant.id
        },
        select: { id: true }
      });
      if (outlet) {
        outletCuid = outlet.id;
      }
    }

    // First, find the user to get their current CUID
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userPublicId,
        merchantId: merchant.id
      },
      select: { id: true }
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Prepare update data, only including fields that were provided
    const updateData: any = {
      updatedAt: new Date()
    };

    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    // Email field is disabled - users cannot change their email address
    // This ensures email uniqueness and prevents account hijacking
    if (phone !== undefined) updateData.phone = phone || null;
    if (role) updateData.role = role;
    if (outletCuid !== undefined) updateData.outletId = outletCuid;
    if (isActive !== undefined) updateData.isActive = isActive;

    console.log('Updating user with data:', updateData);

    // Update user using the CUID
    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: updateData
    });

    console.log('User updated successfully:', updatedUser.id);

    // Get updated user details
    const userDetails = await prisma.user.findFirst({
      where: {
        id: userPublicId,
        merchantId: merchant.id
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        merchant: {
          select: {
            id: true,
            name: true
          }
        },
        outlet: {
          select: {
            id: true,
            name: true,
            address: true
          }
        }
      }
    });

    // Transform data for frontend
    const transformedUser = {
      id: userDetails!.id,
      firstName: userDetails!.firstName,
      lastName: userDetails!.lastName,
      name: `${userDetails!.firstName} ${userDetails!.lastName}`,
      email: userDetails!.email,
      phone: userDetails!.phone || '',
      role: userDetails!.role,
      isActive: userDetails!.isActive,
      createdAt: userDetails!.createdAt.toISOString(),
      updatedAt: userDetails!.updatedAt.toISOString(),
      merchant: userDetails!.merchant ? {
        id: userDetails!.merchant.id,
        name: userDetails!.merchant.name
      } : null,
      outlet: userDetails!.outlet ? {
        id: userDetails!.outlet.id,
        name: userDetails!.outlet.name,
        address: userDetails!.outlet.address
      } : null
    };

    return NextResponse.json({
      success: true,
      data: transformedUser
    });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update user' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// Export functions with withAuthRoles wrapper
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleGetUser(req, context, params)
  );
  return authenticatedHandler(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleUpdateUser(req, context, params)
  );
  return authenticatedHandler(request);
}