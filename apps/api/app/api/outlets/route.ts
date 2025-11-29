import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { outletsQuerySchema, outletCreateSchema, outletUpdateSchema, assertPlanLimit, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/outlets
 * Get outlets with filtering and pagination
 * REFACTORED: Now uses unified withAuth pattern
 */
export const GET = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN, USER_ROLE.OUTLET_STAFF])(async (request, { user, userScope }) => {
  console.log(`🔍 GET /api/outlets - User: ${user.email} (${user.role})`);
  
  try {
    const { searchParams } = new URL(request.url);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const parsed = outletsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      console.log('Validation error:', parsed.error.flatten());
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { 
      merchantId: queryMerchantId,
      isActive,
      q,
      search,
      sortBy,
      sortOrder,
      page,
      limit,
      offset
    } = parsed.data;

    // Use q or search (q takes priority)
    const searchQuery = q || search;

    console.log('Parsed filters:', { 
      queryMerchantId, isActive, searchQuery, sortBy, sortOrder, page, limit, offset
    });
    
    // Use simplified database API with userScope and role-based filtering
    const searchFilters = {
      // Role-based merchant filtering
      merchantId: user.role === USER_ROLE.ADMIN 
        ? (queryMerchantId || undefined)  // Admin can see any merchant's outlets
        : userScope.merchantId,           // Others restricted to their merchant
      
      // Outlet-level users can only see their own outlet
      outletId: (user.role === USER_ROLE.OUTLET_ADMIN || user.role === USER_ROLE.OUTLET_STAFF) 
        ? userScope.outletId 
        : undefined,
        
      isActive: isActive === 'all' ? undefined : (isActive !== undefined ? Boolean(isActive) : true),
      search: searchQuery || undefined, // Search by outlet name
      sortBy: sortBy || 'name',
      sortOrder: sortOrder || 'asc',
      page: page || 1,
      limit: limit || 20,
      offset: offset
    };

    console.log('🔍 Using simplified db.outlets.search with filters:', searchFilters);
    
    const result = await db.outlets.search(searchFilters);
    console.log('✅ Search completed, found:', result.data?.length || 0, 'outlets');

    // Normalize date fields in outlet list to UTC ISO strings using toISOString()
    const normalizedOutlets = (result.data || []).map(outlet => ({
      ...outlet,
      createdAt: outlet.createdAt?.toISOString() || null,
      updatedAt: outlet.updatedAt?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        outlets: normalizedOutlets,
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 20,
        hasMore: result.hasMore || false,
        totalPages: Math.ceil((result.total || 0) / (result.limit || 20))
      },
      code: "OUTLETS_FOUND",
      message: `Found ${result.total || 0} outlets`
    });

  } catch (error) {
    console.error('Error in GET /api/outlets:', error);
    return NextResponse.json(
      ResponseBuilder.error('FETCH_OUTLETS_FAILED'),
      { status: 500 }
    );
  }
});

/**
 * POST /api/outlets
 * Create a new outlet using simplified database API
 * REFACTORED: Now uses unified withAuth pattern
 */
export const POST = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT])(async (request, { user, userScope }) => {
  console.log(`🔍 POST /api/outlets - User: ${user.email} (${user.role})`);
  
  try {
    const body = await request.json();
    const parsed = outletCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        code: 'INVALID_PAYLOAD',
        message: 'Invalid payload', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    // Get merchantId from userScope or from request body
    let merchantId = userScope.merchantId;
    
    // If user is ADMIN and no merchantId in scope, allow them to specify merchantId in request
    if (!merchantId && user.role === USER_ROLE.ADMIN && body.merchantId) {
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
        ResponseBuilder.error('MERCHANT_ID_REQUIRED'),
        { status: 400 }
      );
    }

    // Check for duplicate outlet name within the same merchant
    const existingOutlet = await db.outlets.findFirst({
      name: parsed.data.name,
      merchantId: merchantId,
      isActive: true
    });

    if (existingOutlet) {
      console.log('❌ Outlet name already exists:', parsed.data.name);
      return NextResponse.json(
        {
          success: false,
          code: 'OUTLET_NAME_EXISTS',
          message: `An outlet with the name "${parsed.data.name}" already exists. Please choose a different name.`
        },
        { status: 409 }
      );
    }

    // Check plan limits before creating outlet (ADMIN bypass)
    if (user.role !== USER_ROLE.ADMIN) {
      try {
        await assertPlanLimit(merchantId, 'outlets');
        console.log('✅ Plan limit check passed for outlets');
      } catch (error: any) {
        console.log('❌ Plan limit exceeded for outlets:', error.message);
        return NextResponse.json(
          { 
            success: false, 
            code: 'PLAN_LIMIT_EXCEEDED', message: error.message || 'Plan limit exceeded for outlets',
            error: 'PLAN_LIMIT_EXCEEDED'
          },
          { status: 403 }
        );
      }
    } else {
      console.log('✅ ADMIN user: Bypassing plan limit check for outlets');
    }

    // Create outlet with proper relations
    const outletData = {
      merchant: { connect: { id: merchantId } },
      name: parsed.data.name,
      address: parsed.data.address,
      city: parsed.data.city,
      state: parsed.data.state,
      zipCode: parsed.data.zipCode,
      country: parsed.data.country,
      phone: parsed.data.phone,
      status: parsed.data.status || 'ACTIVE',
      description: parsed.data.description
    };

    console.log('🔍 Creating outlet with data:', outletData);
    
    // Use simplified database API
    const outlet = await db.outlets.create(outletData);
    console.log('✅ Outlet created successfully:', outlet);

    // Normalize date fields to UTC ISO strings using toISOString()
    const normalizedOutlet = {
      ...outlet,
      createdAt: outlet.createdAt?.toISOString() || null,
      updatedAt: outlet.updatedAt?.toISOString() || null,
    };

    return NextResponse.json(
      ResponseBuilder.success('OUTLET_CREATED_SUCCESS', normalizedOutlet)
    );

  } catch (error: any) {
    console.error('Error in POST /api/outlets:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_NAME_EXISTS'),
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      ResponseBuilder.error('CREATE_OUTLET_FAILED'),
      { status: 500 }
    );
  }
});

/**
 * PUT /api/outlets?id={id}
 * Update an outlet using simplified database API  
 * REFACTORED: Now uses unified withAuth pattern
 */
export const PUT = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT])(async (request, { user, userScope }) => {
  console.log(`🔍 PUT /api/outlets - User: ${user.email} (${user.role})`);
  
  try {
    const body = await request.json();
    const parsed = outletUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
        { status: 400 }
      );
    }

    // Extract id from query params
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || searchParams.get('outletId') || '0');

    if (!id) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_ID_REQUIRED'),
        { status: 400 }
      );
    }

    // Get existing outlet to check permissions
    const existingOutlet = await db.outlets.findById(id);
    if (!existingOutlet) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check if user can access this outlet
    if (user.role !== USER_ROLE.ADMIN && existingOutlet.merchantId !== userScope.merchantId) {
      return NextResponse.json(
        ResponseBuilder.error('FORBIDDEN'),
        { status: 403 }
      );
    }

    // Check if trying to deactivate default outlet
    if (parsed.data.isActive === false && existingOutlet.isDefault) {
      return NextResponse.json(
        ResponseBuilder.error('CANNOT_DELETE_DEFAULT_OUTLET'),
        { status: 409 }
      );
    }

    // Check for duplicate outlet name if name is being updated
    if (parsed.data.name && parsed.data.name !== existingOutlet.name) {
      const duplicateOutlet = await db.outlets.findFirst({
        name: parsed.data.name,
        merchantId: existingOutlet.merchantId,
        isActive: true,
        id: { not: id }
      });

      if (duplicateOutlet) {
        console.log('❌ Outlet name already exists:', parsed.data.name);
        return NextResponse.json(
          {
            success: false,
            code: 'OUTLET_NAME_EXISTS',
            message: `An outlet with the name "${parsed.data.name}" already exists. Please choose a different name.`
          },
          { status: 409 }
        );
      }
    }

    // Prepare update data - exclude isActive for default outlets
    const updateData = { ...parsed.data };
    if (existingOutlet.isDefault && 'isActive' in updateData) {
      delete updateData.isActive;
      console.log('🔍 Removed isActive from update data for default outlet');
    }

    console.log('🔍 Updating outlet with data:', { id, ...updateData });
    
    // Use simplified database API
    const updatedOutlet = await db.outlets.update(id, updateData);
    console.log('✅ Outlet updated successfully:', updatedOutlet);

    // Normalize date fields to UTC ISO strings using toISOString()
    const normalizedOutlet = {
      ...updatedOutlet,
      createdAt: updatedOutlet.createdAt?.toISOString() || null,
      updatedAt: updatedOutlet.updatedAt?.toISOString() || null,
    };

    return NextResponse.json(
      ResponseBuilder.success('OUTLET_UPDATED_SUCCESS', normalizedOutlet)
    );

  } catch (error: any) {
    console.error('Error in PUT /api/outlets:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_NAME_EXISTS'),
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      ResponseBuilder.error('UPDATE_OUTLET_FAILED'),
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/outlets?id={id}
 * Delete an outlet (soft delete)
 * REFACTORED: Now uses unified withAuth pattern
 */
export const DELETE = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT])(async (request, { user, userScope }) => {
  console.log(`🔍 DELETE /api/outlets - User: ${user.email} (${user.role})`);
  
  try {
    // Extract id from query params
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || searchParams.get('outletId') || '0');

    if (!id) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_ID_REQUIRED'),
        { status: 400 }
      );
    }

    // Get existing outlet to check permissions
    const existingOutlet = await db.outlets.findById(id);
    if (!existingOutlet) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check if user can access this outlet
    if (user.role !== USER_ROLE.ADMIN && existingOutlet.merchant.id !== userScope.merchantId) {
      return NextResponse.json(
        ResponseBuilder.error('FORBIDDEN'),
        { status: 403 }
      );
    }

    // Prevent deleting default outlet
    if (existingOutlet.isDefault) {
      console.log('❌ Cannot delete default outlet:', id);
      return NextResponse.json(
        {
          success: false,
          code: 'CANNOT_DELETE_DEFAULT_OUTLET',
          message: 'Cannot delete the default outlet. This is the main outlet created during registration and must remain active.'
        },
        { status: 400 }
      );
    }

    console.log('🔍 Soft deleting outlet:', id);
    
    // Soft delete by setting isActive to false
    const deletedOutlet = await db.outlets.update(id, { isActive: false });
    console.log('✅ Outlet soft deleted successfully:', deletedOutlet);

    return NextResponse.json(
      ResponseBuilder.success('OUTLET_DELETED_SUCCESS', deletedOutlet)
    );

  } catch (error: any) {
    console.error('Error in DELETE /api/outlets:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
