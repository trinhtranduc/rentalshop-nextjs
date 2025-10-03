import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { outletsQuerySchema, outletCreateSchema, outletUpdateSchema } from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

/**
 * GET /api/outlets
 * Get outlets with filtering and pagination
 * REFACTORED: Now uses unified withAuth pattern
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  console.log(`🔍 GET /api/outlets - User: ${user.email} (${user.role})`);
  
  try {
    const { searchParams } = new URL(request.url);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const parsed = outletsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      console.log('Validation error:', parsed.error.flatten());
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid query', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { 
      merchantId: queryMerchantId,
      isActive,
      search,
      page,
      limit
    } = parsed.data;

    console.log('Parsed filters:', { 
      queryMerchantId, isActive, search, page, limit 
    });
    
    // Use simplified database API with userScope and role-based filtering
    const searchFilters = {
      // Role-based merchant filtering
      merchantId: user.role === 'ADMIN' 
        ? (queryMerchantId || undefined)  // Admin can see any merchant's outlets
        : userScope.merchantId,           // Others restricted to their merchant
      
      // Outlet-level users can only see their own outlet
      outletId: (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') 
        ? userScope.outletId 
        : undefined,
        
      isActive: isActive === 'all' ? undefined : (isActive !== undefined ? Boolean(isActive) : true),
      search: search || undefined,
      page: page || 1,
      limit: limit || 20
    };

    console.log('🔍 Using simplified db.outlets.search with filters:', searchFilters);
    
    const result = await db.outlets.search(searchFilters);
    console.log('✅ Search completed, found:', result.data?.length || 0, 'outlets');

    return NextResponse.json({
      success: true,
      data: {
        outlets: result.data || [],
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 20,
        hasMore: result.hasMore || false,
        totalPages: Math.ceil((result.total || 0) / (result.limit || 20))
      },
      message: `Found ${result.total || 0} outlets`
    });

  } catch (error) {
    console.error('Error in GET /api/outlets:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch outlets' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/outlets
 * Create a new outlet using simplified database API
 * REFACTORED: Now uses unified withAuth pattern
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
  console.log(`🔍 POST /api/outlets - User: ${user.email} (${user.role})`);
  
  try {
    const body = await request.json();
    const parsed = outletCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid payload', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    // Get merchantId from userScope or from request body
    let merchantId = userScope.merchantId;
    
    // If user is ADMIN and no merchantId in scope, allow them to specify merchantId in request
    if (!merchantId && user.role === 'ADMIN' && body.merchantId) {
      merchantId = body.merchantId;
    }
    
    console.log('🔍 User scope debug:', {
      userRole: user.role,
      userScope,
      requestMerchantId: body.merchantId,
      resolvedMerchantId: merchantId,
      hasMerchantId: !!merchantId
    });

    if (!merchantId) {
      console.log('❌ No merchantId available for user:', user.email);
      return NextResponse.json(
        { success: false, message: 'Merchant ID is required. Please provide merchantId in request body for admin users or ensure you are logged in as a merchant.' },
        { status: 400 }
      );
    }

    // Create outlet with proper relations
    const outletData = {
      merchant: { connect: { id: merchantId } },
      name: parsed.data.name,
      address: parsed.data.address,
      phone: parsed.data.phone,
      status: parsed.data.status || 'ACTIVE',
      description: parsed.data.description
    };

    console.log('🔍 Creating outlet with data:', outletData);
    
    // Use simplified database API
    const outlet = await db.outlets.create(outletData);
    console.log('✅ Outlet created successfully:', outlet);

    return NextResponse.json({
      success: true,
      data: outlet,
      message: 'Outlet created successfully'
    });

  } catch (error: any) {
    console.error('Error in POST /api/outlets:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'An outlet with this name already exists for this merchant' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to create outlet' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/outlets?id={id}
 * Update an outlet using simplified database API  
 * REFACTORED: Now uses unified withAuth pattern
 */
export const PUT = withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
  console.log(`🔍 PUT /api/outlets - User: ${user.email} (${user.role})`);
  
  try {
    const body = await request.json();
    const parsed = outletUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid payload', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    // Extract id from query params
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || searchParams.get('outletId') || '0');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Outlet ID is required' },
        { status: 400 }
      );
    }

    // Get existing outlet to check permissions
    const existingOutlet = await db.outlets.findById(id);
    if (!existingOutlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }

    // Check if user can access this outlet
    if (user.role !== 'ADMIN' && existingOutlet.merchantId !== userScope.merchantId) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    console.log('🔍 Updating outlet with data:', { id, ...parsed.data });
    
    // Use simplified database API
    const updatedOutlet = await db.outlets.update(id, parsed.data);
    console.log('✅ Outlet updated successfully:', updatedOutlet);

    return NextResponse.json({
      success: true,
      data: updatedOutlet,
      message: 'Outlet updated successfully'
    });

  } catch (error: any) {
    console.error('Error in PUT /api/outlets:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'An outlet with this name already exists for this merchant' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to update outlet' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/outlets?id={id}
 * Delete an outlet (soft delete)
 * REFACTORED: Now uses unified withAuth pattern
 */
export const DELETE = withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user, userScope }) => {
  console.log(`🔍 DELETE /api/outlets - User: ${user.email} (${user.role})`);
  
  try {
    // Extract id from query params
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || searchParams.get('outletId') || '0');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Outlet ID is required' },
        { status: 400 }
      );
    }

    // Get existing outlet to check permissions
    const existingOutlet = await db.outlets.findById(id);
    if (!existingOutlet) {
      return NextResponse.json(
        { success: false, message: 'Outlet not found' },
        { status: 404 }
      );
    }

    // Check if user can access this outlet
    if (user.role !== 'ADMIN' && existingOutlet.merchant.id !== userScope.merchantId) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    console.log('🔍 Soft deleting outlet:', id);
    
    // Soft delete by setting isActive to false
    const deletedOutlet = await db.outlets.update(id, { isActive: false });
    console.log('✅ Outlet soft deleted successfully:', deletedOutlet);

    return NextResponse.json({
      success: true,
      data: deletedOutlet,
      message: 'Outlet deleted successfully'
    });

  } catch (error: any) {
    console.error('Error in DELETE /api/outlets:', error);
    
    return NextResponse.json(
      { success: false, message: 'Failed to delete outlet' },
      { status: 500 }
    );
  }
});