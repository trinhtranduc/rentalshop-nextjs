import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    const merchantPublicId = parseInt(params.id);
    const userPublicId = parseInt(params.userId);
    
    if (isNaN(merchantPublicId) || isNaN(userPublicId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant or user ID' },
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

    // Get user details
    const userDetails = await prisma.user.findFirst({
      where: {
        publicId: userPublicId,
        merchantId: merchant.id
      },
      select: {
        id: true,
        publicId: true,
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
            publicId: true,
            name: true
          }
        },
        outlet: {
          select: {
            id: true,
            publicId: true,
            name: true,
            address: true
          }
        }
      }
    });

    if (!userDetails) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get all outlets for this merchant (for role assignment)
    const outlets = await prisma.outlet.findMany({
      where: { merchantId: merchant.id },
      select: {
        id: true,
        publicId: true,
        name: true,
        address: true
      }
    });

    // Transform data for frontend
    const transformedUser = {
      id: userDetails.publicId,
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
        id: userDetails.merchant.publicId,
        name: userDetails.merchant.name
      } : null,
      outlet: userDetails.outlet ? {
        id: userDetails.outlet.publicId,
        name: userDetails.outlet.name,
        address: userDetails.outlet.address
      } : null
    };

    const transformedOutlets = outlets.map(outlet => ({
      id: outlet.publicId,
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
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    const merchantPublicId = parseInt(params.id);
    const userPublicId = parseInt(params.userId);
    
    if (isNaN(merchantPublicId) || isNaN(userPublicId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant or user ID' },
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
          publicId: parseInt(outletId),
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
        publicId: userPublicId,
        merchantId: merchant.id
      },
      select: { id: true }
    });

    if (!existingUser) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
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

    console.log('User updated successfully:', updatedUser.publicId);

    // Get updated user details
    const userDetails = await prisma.user.findFirst({
      where: {
        publicId: userPublicId,
        merchantId: merchant.id
      },
      select: {
        id: true,
        publicId: true,
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
            publicId: true,
            name: true
          }
        },
        outlet: {
          select: {
            id: true,
            publicId: true,
            name: true,
            address: true
          }
        }
      }
    });

    // Transform data for frontend
    const transformedUser = {
      id: userDetails!.publicId,
      firstName: userDetails!.firstName,
      lastName: userDetails!.lastName,
      name: `${userDetails!.firstName} ${userDetails!.lastName}`,
      email: userDetails!.email,
      phone: userDetails!.phone || '',
      role: userDetails!.role,
      isActive: userDetails!.isActive,
      emailVerified: userDetails!.emailVerified,
      lastLoginAt: userDetails!.lastLoginAt?.toISOString(),
      createdAt: userDetails!.createdAt.toISOString(),
      updatedAt: userDetails!.updatedAt.toISOString(),
      merchant: userDetails!.merchant ? {
        id: userDetails!.merchant.publicId,
        name: userDetails!.merchant.name
      } : null,
      outlet: userDetails!.outlet ? {
        id: userDetails!.outlet.publicId,
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
      { status: 500 }
    );
  }
}
