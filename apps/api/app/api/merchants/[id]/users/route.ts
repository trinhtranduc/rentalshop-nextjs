import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import {API} from '@rentalshop/constants';

async function handleGetMerchantUsers(
  request: NextRequest,
  { user, userScope }: { user: any; userScope: any },
  params: { id: string }
) {
  try {

    const merchantPublicId = parseInt(params.id);
    if (isNaN(merchantPublicId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid merchant ID' },
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

    // ✅ Authorization check: Ensure user can access this merchant's users
    let canAccessMerchantUsers = false;
    
    if (user.role === 'ADMIN') {
      // ADMIN can access any merchant's users
      canAccessMerchantUsers = true;
      console.log('✅ ADMIN access granted for merchant users');
    } else if (user.role === 'MERCHANT') {
      // MERCHANT can access users in their own merchant
      if (userScope.merchantId && merchant.id === userScope.merchantId) {
        canAccessMerchantUsers = true;
        console.log('✅ MERCHANT access granted for own merchant users');
      }
    } else if (user.role === 'OUTLET_ADMIN') {
      // OUTLET_ADMIN can access users in their outlet's merchant
      if (userScope.merchantId && merchant.id === userScope.merchantId) {
        canAccessMerchantUsers = true;
        console.log(`✅ ${user.role} access granted for outlet's merchant users`);
      }
    }
    // Note: OUTLET_STAFF cannot access user management

    if (!canAccessMerchantUsers) {
      console.log('❌ Access denied for merchant users:', {
        userRole: user.role,
        requestedMerchantId: merchant.id,
        userScope: userScope
      });
      return NextResponse.json(
        { 
          success: false, 
          message: 'Insufficient permissions to access merchant users',
          required: ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'],
          current: user.role
        },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') || undefined;
    const isActive = searchParams.get('isActive') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {
      merchantId: merchant.id // Use the actual CUID
    };

    // Add search filter
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    // Add role filter
    if (role) {
      where.role = role;
    }

    // Add status filter
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
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
        outlet: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Transform data for frontend
    const transformedUsers = users.map(user => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      outlet: user.outlet ? {
        id: user.outlet.id,
        name: user.outlet.name
      } : null
    }));

    return NextResponse.json({
      success: true,
      data: {
        users: transformedUsers,
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    });

  } catch (error) {
    console.error('Error fetching merchant users:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// Export function with withAuthRoles wrapper
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authWrapper = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN']);
  const authenticatedHandler = authWrapper((req, context) => 
    handleGetMerchantUsers(req, context, params)
  );
  return authenticatedHandler(request);
}
