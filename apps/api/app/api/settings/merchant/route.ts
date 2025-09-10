import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';
import { updateMerchant } from '@rentalshop/database';

/**
 * PUT /api/settings/merchant
 * Update current user's merchant business information
 * Only accessible by users with merchant role or admin
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Check if user has merchant access
    if (!user.merchant?.id) {
      return NextResponse.json(
        { success: false, message: 'User does not have merchant access' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      name, 
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

    // Email field is disabled - users cannot change their email address
    // This ensures email uniqueness and prevents account hijacking

    // Update merchant using the centralized database function
    const updatedMerchant = await updateMerchant(user.merchant.id, {
      name,
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