import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple, handleSubscriptionError } from '@rentalshop/auth';
import { findUserById, updateUser, prisma } from '@rentalshop/database';

/**
 * GET /api/users/profile
 * Get current user's profile
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Profile API called');
    
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    console.log('Token received:', !!token);
    
    if (!token) {
      console.log('No token provided');
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    console.log('Token verification result:', !!user, user ? { id: user.id, role: user.role } : null);
    
    if (!user) {
      console.log('Token verification failed');
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get user profile with complete merchant and outlet data
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        merchant: {
          select: {
            id: true,
            publicId: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            businessType: true,
            taxId: true,
            website: true,
            description: true,
            isActive: true,
            planId: true,
            subscriptionStatus: true,
            totalRevenue: true,
            createdAt: true,
            lastActiveAt: true,
          }
        },
        outlet: {
          select: {
            id: true,
            publicId: true,
            name: true,
            address: true,
            phone: true,
            description: true,
            isActive: true,
            isDefault: true,
            createdAt: true,
            merchant: {
              select: {
                id: true,
                publicId: true,
                name: true,
              }
            }
          }
        },
      },
    });

    if (!userProfile) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Transform user data to include complete merchant and outlet information
    const transformedUser = {
      ...userProfile,
      // Direct IDs for quick access
      merchantId: userProfile.merchant?.publicId,
      outletId: userProfile.outlet?.publicId,
      // Complete merchant object with all business info
      merchant: userProfile.merchant ? {
        id: userProfile.merchant.publicId,
        name: userProfile.merchant.name,
        email: userProfile.merchant.email,
        phone: userProfile.merchant.phone,
        address: userProfile.merchant.address,
        city: userProfile.merchant.city,
        state: userProfile.merchant.state,
        zipCode: userProfile.merchant.zipCode,
        country: userProfile.merchant.country,
        businessType: userProfile.merchant.businessType,
        taxId: userProfile.merchant.taxId,
        website: userProfile.merchant.website,
        description: userProfile.merchant.description,
        isActive: userProfile.merchant.isActive,
        planId: userProfile.merchant.planId,
        subscriptionStatus: userProfile.merchant.subscriptionStatus,
        totalRevenue: userProfile.merchant.totalRevenue,
        createdAt: userProfile.merchant.createdAt,
        lastActiveAt: userProfile.merchant.lastActiveAt,
      } : undefined,
      // Complete outlet object with all outlet info  
      outlet: userProfile.outlet ? {
        id: userProfile.outlet.publicId,
        name: userProfile.outlet.name,
        address: userProfile.outlet.address,
        phone: userProfile.outlet.phone,
        description: userProfile.outlet.description,
        isActive: userProfile.outlet.isActive,
        isDefault: userProfile.outlet.isDefault,
        createdAt: userProfile.outlet.createdAt,
        merchant: userProfile.outlet.merchant ? {
          id: userProfile.outlet.merchant.publicId,
          name: userProfile.outlet.merchant.name,
        } : undefined,
      } : undefined,
    };

    console.log('Profile API - User data:', {
      userId: user.id,
      role: userProfile.role,
      merchantId: userProfile.merchant?.publicId,
      outletId: userProfile.outlet?.publicId,
      hasMerchant: !!userProfile.merchant,
      hasOutlet: !!userProfile.outlet,
      merchantName: userProfile.merchant?.name,
      outletName: userProfile.outlet?.name
    });

    return NextResponse.json({
      success: true,
      data: transformedUser,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    
    // Handle subscription errors consistently
    const errorResponse = handleSubscriptionError(error);
    return NextResponse.json(
      { 
        success: errorResponse.success, 
        error: errorResponse.error
      },
      { status: errorResponse.status }
    );
  }
}

/**
 * PUT /api/users/profile
 * Update current user's profile
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

    const body = await request.json();
    
    // Validate input
    const { firstName, lastName, email, phone } = body;
    
    // Only allow updating certain fields
    const updateData: any = {};
    if (firstName && firstName.trim()) updateData.firstName = firstName.trim();
    if (lastName && lastName.trim()) updateData.lastName = lastName.trim();
    if (email && email.trim()) updateData.email = email.toLowerCase().trim();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid fields to update' 
        },
        { status: 400 }
      );
    }

    // Get user's publicId to use with updateUser function
    const userWithPublicId = await prisma.user.findUnique({
      where: { id: user.id },
      select: { publicId: true }
    });

    if (!userWithPublicId) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Update user profile using publicId
    const updatedUser = await updateUser(userWithPublicId.publicId, updateData);

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update user profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 