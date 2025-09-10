import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@rentalshop/auth';
import { 
  searchOutlets,
  createOutlet,
  updateOutlet,
  deleteOutlet
} from '@rentalshop/database';
import { outletsQuerySchema, outletCreateSchema, outletUpdateSchema } from '@rentalshop/utils';
import { assertAnyRole, getUserScope } from '@rentalshop/auth';
import type { OutletCreateInput, OutletUpdateInput } from '@rentalshop/types';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/outlets
 * Get outlets with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Get user scope for role-based access control
    const userScope = getUserScope(user as any);
    
    // Check if user can access outlets based on their role
    if (!userScope.merchantId && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant to view outlets' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const parsed = outletsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid query parameters', error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { merchantId, isActive, search, page, limit } = parsed.data;

    // Build search filters with role-based restrictions
    const filters = {
      // Role-based filtering: Users can only see outlets within their scope
      merchantId: user.role === 'ADMIN' 
        ? (merchantId || undefined)  // Admin can see any merchant's outlets
        : userScope.merchantId,      // Non-admin users restricted to their merchant
      outletId: userScope.outletId,  // Add outletId filter for outlet-level users
      isActive: isActive === 'all' ? undefined : (isActive !== undefined ? Boolean(isActive) : true),
      search: search || undefined,
      page: page || 1,
      limit: limit || 20
    };

    // Additional role-based filtering for outlet-level users
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      if (userScope.outletId) {
        // Outlet users can only see their assigned outlet
        // Override any merchantId filter to ensure they only see their outlet
        filters.merchantId = userScope.merchantId;
        // Note: We'll need to filter by specific outletId in the database function
      }
    }

    // Use the new database function that follows dual ID system
    const result = await searchOutlets(filters);
    
    // Additional filtering for outlet-level users (if not handled in database)
    let filteredOutlets = result.outlets;
    if ((user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') && userScope.outletId) {
      // Filter to only show the user's assigned outlet
      filteredOutlets = result.outlets.filter(outlet => outlet.id === userScope.outletId);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...result,
        outlets: filteredOutlets
      }
    });

  } catch (error) {
    console.error('Error in GET /api/outlets:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';

/**
 * POST /api/outlets
 * Create a new outlet
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Check if user can create outlets
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = outletCreateSchema.parse(body);

    // Get merchant ID from user scope
    const userScope = getUserScope(user as any);
    const userMerchantId = userScope.merchantId;

    if (!userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'User must be associated with a merchant' },
        { status: 400 }
      );
    }

    // Check if outlet name is unique within merchant organization
    const existingOutlet = await prisma.outlet.findFirst({
      where: {
        name: validatedData.name.trim(),
        merchantId: user.merchant!.id // Use CUID from user
      }
    });

    if (existingOutlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet name must be unique within your merchant organization' },
        { status: 400 }
      );
    }

    // Use the new database function that follows dual ID system
    const newOutlet = await createOutlet({
      ...validatedData,
      merchantId: userMerchantId
    }, userMerchantId);

    return NextResponse.json({
      success: true,
      data: newOutlet,
      message: 'Outlet created successfully'
    });

  } catch (error: any) {
    console.error('Error creating outlet:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'Outlet name must be unique within your merchant organization' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to create outlet', error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/outlets?outletId=xxx
 * Update an existing outlet
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Outlet PUT API called');
    
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      console.error('❌ DEBUG: Authentication failed in outlet PUT');
      return authResult.response;
    }
    
    const user = authResult.user;
    console.log('🔍 DEBUG: User authenticated:', {
      id: user.id,
      role: user.role,
      merchantId: user.merchant?.id,
      outletId: user.outletId
    });

    // Check if user can update outlets
    // Admin users can update any outlet, MERCHANT users can update their own outlets
    if (user.role !== 'ADMIN' && user.role !== 'MERCHANT') {
      console.error('❌ DEBUG: User does not have permission to update outlets:', user.role);
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    console.log('🔍 DEBUG: User has permission to update outlets');

    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outletId');

    if (!outletId) {
      return NextResponse.json(
        { success: false, message: 'Outlet ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = outletUpdateSchema.parse(body);

    // Parse outlet ID
    const outletIdNumber = parseInt(outletId);
    if (isNaN(outletIdNumber)) {
      return NextResponse.json(
        { success: false, message: 'Invalid outlet ID format' },
        { status: 400 }
      );
    }

    // Check if outlet exists and belongs to user's merchant
    // For admin users, allow access to any outlet
    // For other users, check merchant ownership
    const whereClause: any = {
      publicId: outletIdNumber,
    };
    
    if (user.merchant?.id) {
      whereClause.merchantId = user.merchant.id;
    }
    // Admin users (merchantId: null) can access any outlet
    
    const existingOutlet = await prisma.outlet.findFirst({
      where: whereClause
    });

    if (!existingOutlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found or access denied' },
        { status: 404 }
      );
    }

    // Check if name is being changed and if it's unique within merchant organization
    if (validatedData.name && validatedData.name !== existingOutlet.name) {
      const duplicateWhereClause: any = {
        name: validatedData.name.trim(),
        id: { not: existingOutlet.id } // Exclude current outlet
      };
      
      // Only check within same merchant for non-admin users
      if (user.merchant?.id) {
        duplicateWhereClause.merchantId = user.merchant.id;
      }
      
      const duplicateOutlet = await prisma.outlet.findFirst({
        where: duplicateWhereClause
      });

      if (duplicateOutlet) {
        return NextResponse.json(
          { success: false, message: 'Outlet name must be unique within your merchant organization' },
          { status: 400 }
        );
      }
    }

    // Use the new database function that follows dual ID system
    const updatedOutlet = await updateOutlet(outletIdNumber, validatedData);

    return NextResponse.json({
      success: true,
      data: updatedOutlet,
      message: 'Outlet updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating outlet:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'Outlet name must be unique within your merchant organization' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to update outlet', error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/outlets?outletId=xxx
 * Delete an outlet
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Check if user can delete outlets
    try {
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT']);
    } catch {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outletId');

    if (!outletId) {
      return NextResponse.json(
        { success: false, message: 'Outlet ID is required' },
        { status: 400 }
      );
    }

    // Parse outlet ID
    const outletIdNumber = parseInt(outletId);
    if (isNaN(outletIdNumber)) {
      return NextResponse.json(
        { success: false, message: 'Invalid outlet ID format' },
        { status: 400 }
      );
    }

    // Check if outlet exists and belongs to user's merchant
    const existingOutlet = await prisma.outlet.findFirst({
      where: {
        publicId: outletIdNumber,
        merchantId: user.merchant!.id // Use CUID from user
      }
    });

    if (!existingOutlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found or access denied' },
        { status: 404 }
      );
    }

    // Safety checks: prevent deletion if outlet has associated data
    const [orderCount, productCount, userCount] = await Promise.all([
      prisma.order.count({ where: { outletId: existingOutlet.id } }),
      prisma.outletStock.count({ where: { outletId: existingOutlet.id } }),
      prisma.user.count({ where: { outletId: existingOutlet.id } })
    ]);

    if (orderCount > 0) {
      return NextResponse.json(
        { success: false, message: `Cannot delete outlet: ${orderCount} order(s) exist` },
        { status: 400 }
      );
    }

    if (productCount > 0) {
      return NextResponse.json(
        { success: false, message: `Cannot delete outlet: ${productCount} product(s) exist` },
        { status: 400 }
      );
    }

    if (userCount > 0) {
      return NextResponse.json(
        { success: false, message: `Cannot delete outlet: ${userCount} user(s) exist` },
        { status: 400 }
      );
    }

    // Use the new database function that follows dual ID system
    await deleteOutlet(outletIdNumber);

    return NextResponse.json({
      success: true,
      message: 'Outlet deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting outlet:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete outlet', error: error.message },
      { status: 500 }
    );
  }
}

