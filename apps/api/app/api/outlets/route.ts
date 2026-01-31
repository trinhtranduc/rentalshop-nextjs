import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { outletsQuerySchema, outletCreateSchema, outletUpdateSchema, checkPlanLimitIfNeeded, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

/**
 * GET /api/outlets
 * Get outlets with filtering and pagination
 * Authorization: Roles with 'outlet.view' permission can access
 */
export const GET = withApiLogging(
  withPermissions(['outlet.view'])(async (request, { user, userScope }) => {
    try {
      const { searchParams } = new URL(request.url);
      
      const parsed = outletsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
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
    
    const result = await db.outlets.search(searchFilters);

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
      // Error will be automatically logged by withApiLogging wrapper
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);

/**
 * POST /api/outlets
 * Create a new outlet using simplified database API
 * Authorization: Roles with 'outlet.manage' permission can create outlets
 */
export const POST = withApiLogging(
  withPermissions(['outlet.manage'])(async (request, { user, userScope }) => {
    try {
    const body = await request.json();
    const parsed = outletCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    // Get merchantId from userScope or from request body
    let merchantId = userScope.merchantId;
    
    // If user is ADMIN and no merchantId in scope, allow them to specify merchantId in request
    if (!merchantId && user.role === USER_ROLE.ADMIN && body.merchantId) {
      merchantId = body.merchantId;
    }

    if (!merchantId) {
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
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_NAME_EXISTS'),
        { status: 409 }
      );
    }

    // Check plan limits before creating outlet (ADMIN bypass)
    const planLimitError = await checkPlanLimitIfNeeded(user, merchantId, 'outlets');
    if (planLimitError) return planLimitError;

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
    
    // Use simplified database API
    const outlet = await db.outlets.create(outletData);

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
      // Error will be automatically logged by withApiLogging wrapper
      // Handle specific Prisma errors
      if (error.code === 'P2002') {
        return NextResponse.json(
          ResponseBuilder.error('OUTLET_NAME_EXISTS'),
          { status: 409 }
        );
      }
      
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);

/**
 * PUT /api/outlets?id={id}
 * Update an outlet using simplified database API
 * Authorization: Roles with 'outlet.manage' permission can update outlets
 */
export const PUT = withApiLogging(
  withPermissions(['outlet.manage'])(async (request, { user, userScope }) => {
    try {
    const body = await request.json();
    const parsed = outletUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
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
    // Authorization rules:
    // - ADMIN: Can update any outlet
    // - MERCHANT: Can update outlets of their merchant (check merchantId)
    // - OUTLET_ADMIN: Can update their assigned outlet (check outletId)
    // - OUTLET_STAFF: Cannot update (only view permission)
    if (user.role !== USER_ROLE.ADMIN) {
      if (user.role === USER_ROLE.MERCHANT) {
        // MERCHANT: Must be same merchant
        if (existingOutlet.merchantId !== userScope.merchantId) {
          return NextResponse.json(
            ResponseBuilder.error('FORBIDDEN'),
            { status: 403 }
          );
        }
      } else if (user.role === USER_ROLE.OUTLET_ADMIN) {
        // OUTLET_ADMIN: Must be their assigned outlet
        if (existingOutlet.id !== userScope.outletId) {
          return NextResponse.json(
            ResponseBuilder.error('FORBIDDEN'),
            { status: 403 }
          );
        }
      } else {
        // OUTLET_STAFF or other roles: Cannot update outlets
        return NextResponse.json(
          ResponseBuilder.error('FORBIDDEN'),
          { status: 403 }
        );
      }
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
        return NextResponse.json(
          ResponseBuilder.error('OUTLET_NAME_EXISTS'),
          { status: 409 }
        );
      }
    }

    // Prepare update data - exclude isActive for default outlets
    const updateData = { ...parsed.data };
    if (existingOutlet.isDefault && 'isActive' in updateData) {
      delete updateData.isActive;
    }
    
    // Use simplified database API
    const updatedOutlet = await db.outlets.update(id, updateData);

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
      // Error will be automatically logged by withApiLogging wrapper
      // Handle specific Prisma errors
      if (error.code === 'P2002') {
        return NextResponse.json(
          ResponseBuilder.error('OUTLET_NAME_EXISTS'),
          { status: 409 }
        );
      }
      
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);

/**
 * DELETE /api/outlets?id={id}
 * Delete an outlet (soft delete)
 * Authorization: Roles with 'outlet.manage' permission can delete outlets
 */
export const DELETE = withApiLogging(
  withPermissions(['outlet.manage'])(async (request, { user, userScope }) => {
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
      return NextResponse.json(
        ResponseBuilder.error('CANNOT_DELETE_DEFAULT_OUTLET'),
        { status: 400 }
      );
    }
    
    // Soft delete by setting isActive to false
    const deletedOutlet = await db.outlets.update(id, { isActive: false });

    return NextResponse.json(
      ResponseBuilder.success('OUTLET_DELETED_SUCCESS', deletedOutlet)
    );

    } catch (error: any) {
      // Error will be automatically logged by withApiLogging wrapper
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);
