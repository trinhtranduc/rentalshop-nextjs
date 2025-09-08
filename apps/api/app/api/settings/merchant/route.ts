import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { prisma } from '@rentalshop/database';

/**
 * PUT /api/settings/merchant
 * Update current user's merchant business information
 * Only accessible by users with merchant role or admin
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

    // Check if user has merchant access
    if (!user.merchantId) {
      return NextResponse.json(
        { success: false, message: 'User does not have merchant access' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      email, 
      phone, 
      address, 
      city, 
      state, 
      zipCode, 
      country, 
      businessType, 
      taxId, 
      website, 
      description 
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Business name is required' },
        { status: 400 }
      );
    }

    // Check if email already exists (if changing email)
    if (email) {
      const existingMerchant = await prisma.merchant.findFirst({
        where: {
          email,
          NOT: { id: user.merchantId }
        }
      });

      if (existingMerchant) {
        return NextResponse.json(
          { success: false, message: 'Email already exists' },
          { status: 400 }
        );
      }
    }

    // Update merchant
    const updatedMerchant = await prisma.merchant.update({
      where: { id: user.merchantId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(zipCode !== undefined && { zipCode }),
        ...(country !== undefined && { country }),
        ...(businessType !== undefined && { businessType }),
        ...(taxId !== undefined && { taxId }),
        ...(website !== undefined && { website }),
        ...(description !== undefined && { description }),
        lastActiveAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Merchant information updated successfully',
      data: {
        id: updatedMerchant.publicId,
        name: updatedMerchant.name,
        email: updatedMerchant.email,
        phone: updatedMerchant.phone,
        address: updatedMerchant.address,
        city: updatedMerchant.city,
        state: updatedMerchant.state,
        zipCode: updatedMerchant.zipCode,
        country: updatedMerchant.country,
        businessType: updatedMerchant.businessType,
        taxId: updatedMerchant.taxId,
        website: updatedMerchant.website,
        description: updatedMerchant.description,
        isActive: updatedMerchant.isActive,
        planId: updatedMerchant.planId,
        subscriptionStatus: updatedMerchant.subscriptionStatus,
        totalRevenue: updatedMerchant.totalRevenue,
        createdAt: updatedMerchant.createdAt,
        lastActiveAt: updatedMerchant.lastActiveAt
      }
    });

  } catch (error) {
    console.error('Error updating merchant information:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to update merchant information', error: errorMessage },
      { status: 500 }
    );
  }
}