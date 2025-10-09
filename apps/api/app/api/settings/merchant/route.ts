import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { handleApiError } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * PUT /api/settings/merchant
 * Update current user's merchant business information
 * Only accessible by users with merchant role or admin
 */
export const PUT = withAuthRoles(['ADMIN', 'MERCHANT'])(async (request: NextRequest, { user, userScope }) => {
  try {
    console.log('🔍 MERCHANT API: PUT /api/settings/merchant called');
    console.log('🔍 MERCHANT API: Request method:', request.method);
    console.log('🔍 MERCHANT API: Request URL:', request.url);
    console.log('🔍 MERCHANT API: Request headers:', Object.fromEntries(request.headers.entries()));
    
    console.log('🔍 MERCHANT API: Authentication successful:', {
      userId: user.id,
      email: user.email,
      role: user.role
    });

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
    console.log('🔍 MERCHANT API: Looking up user in database with id:', user.id);
    const dbUser = await db.users.findById(user.id);

    console.log('🔍 MERCHANT API: Database query result:', {
      userFound: !!dbUser,
      hasMerchant: !!(dbUser?.merchant),
      merchantId: dbUser?.merchant?.id,
      merchantPublicId: dbUser?.merchant?.id
    });

    if (!dbUser || !dbUser.merchant) {
      console.log('🔍 MERCHANT API: User or merchant not found, returning 403');
      return NextResponse.json(
        { success: false, message: 'User does not have merchant access' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Update merchant using the centralized database function
    console.log('🔍 MERCHANT API: Calling updateMerchant with id:', dbUser.merchant.id);
    const updatedMerchant = await db.merchants.update(dbUser.merchant.id, {
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
        id: updatedMerchant.id,
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
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});