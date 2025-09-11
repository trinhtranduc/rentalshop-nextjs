import { NextRequest, NextResponse } from 'next/server';
import { updateMerchant, prisma } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import { API } from '@rentalshop/constants';

/**
 * PUT /api/settings/merchant
 * Update current user's merchant business information
 * Only accessible by users with merchant role or admin
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('🔍 MERCHANT API: PUT /api/settings/merchant called');
    console.log('🔍 MERCHANT API: Request method:', request.method);
    console.log('🔍 MERCHANT API: Request URL:', request.url);
    console.log('🔍 MERCHANT API: Request headers:', Object.fromEntries(request.headers.entries()));
    
    // Verify authentication using the centralized method (same as profile API)
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      console.log('🔍 MERCHANT API: Authentication failed');
      return authResult.response;
    }

    const user = authResult.user;
    console.log('🔍 MERCHANT API: Authentication successful:', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Check if user has merchant role
    if (user.role !== 'MERCHANT' && user.role !== 'ADMIN') {
      console.log('🔍 MERCHANT API: Invalid role, returning 403');
      return NextResponse.json(
        { success: false, message: 'Merchant access required' },
        { status: API.STATUS.FORBIDDEN }
      );
    }
    
    console.log('🔍 MERCHANT API: Role check passed, proceeding with request');

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
        { status: API.STATUS.BAD_REQUEST }
      );
    }

    // Email field is disabled - users cannot change their email address
    // This ensures email uniqueness and prevents account hijacking

    // Get the merchant ID from the authenticated user
    console.log('🔍 MERCHANT API: Looking up user in database with publicId:', user.id);
    const dbUser = await prisma.user.findUnique({
      where: { publicId: user.id },
      include: { merchant: true }
    });

    console.log('🔍 MERCHANT API: Database query result:', {
      userFound: !!dbUser,
      hasMerchant: !!(dbUser?.merchant),
      merchantId: dbUser?.merchant?.id,
      merchantPublicId: dbUser?.merchant?.publicId
    });

    if (!dbUser || !dbUser.merchant) {
      console.log('🔍 MERCHANT API: User or merchant not found, returning 403');
      return NextResponse.json(
        { success: false, message: 'User does not have merchant access' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Update merchant using the centralized database function
    console.log('🔍 MERCHANT API: Calling updateMerchant with publicId:', dbUser.merchant.publicId);
    const updatedMerchant = await updateMerchant(dbUser.merchant.publicId, {
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

    console.log('🔍 MERCHANT API: Update successful, returning response');
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
    console.error('🔍 MERCHANT API: Error updating merchant information:', error);
    console.error('🔍 MERCHANT API: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, message: 'Failed to update merchant information', error: errorMessage },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}