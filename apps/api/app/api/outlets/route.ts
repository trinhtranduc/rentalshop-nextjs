import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils/api';
import { outletsQuerySchema, outletCreateSchema, outletUpdateSchema, assertPlanLimit, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { API } from '@rentalshop/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/outlets
 * Get outlets with filtering and pagination
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user }) => {
  console.log(`🔍 GET /api/outlets - User: ${user.email} (${user.role})`);
  
  try {
    const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
    
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
      merchantId: queryMerchantId, // Ignore in multi-tenant
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
      isActive, searchQuery, sortBy, sortOrder, page, limit, offset
    });
    
    // Build where clause - NO merchantId needed
    const where: any = {};
    
    // Outlet-level users can only see their own outlet
    if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
      where.id = user.outletId;
    }
    
    if (isActive !== 'all' && isActive !== undefined) {
      where.isActive = Boolean(isActive);
    } else {
      where.isActive = true; // Default to active
    }
    
    if (searchQuery) {
      where.name = { contains: searchQuery, mode: 'insensitive' };
    }

    const pageNum = page || 1;
    const limitNum = limit || 20;
    const skip = offset || (pageNum - 1) * limitNum;
    
    console.log('🔍 Using Prisma with where clause:', where);
    
    const [outlets, total] = await Promise.all([
      db.outlet.findMany({
        where,
        orderBy: { [sortBy || 'name']: sortOrder || 'asc' },
        take: limitNum,
        skip
      }),
      db.outlet.count({ where })
    ]);
    console.log('✅ Search completed, found:', outlets.length, 'outlets');

    return NextResponse.json({
      success: true,
      data: {
        outlets: outlets,
        total: total,
        page: pageNum,
        limit: limitNum,
        hasMore: skip + limitNum < total,
        totalPages: Math.ceil(total / limitNum)
      },
      code: "OUTLETS_FOUND",
      message: `Found ${total} outlets`
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
 * Create a new outlet
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user }) => {
  console.log(`🔍 POST /api/outlets - User: ${user.email} (${user.role})`);
  
  try {
    const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
    
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

    // Check for duplicate outlet name (NO merchantId needed)
    const existingOutlet = await db.outlet.findFirst({
      where: {
        name: parsed.data.name,
        isActive: true
      }
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

    // Create outlet (NO merchantId needed)
    const outlet = await db.outlet.create({
      data: {
        name: parsed.data.name,
        address: parsed.data.address,
        city: parsed.data.city,
        state: parsed.data.state,
        zipCode: parsed.data.zipCode,
        country: parsed.data.country,
        phone: parsed.data.phone,
        description: parsed.data.description
      } as any
    });
    console.log('✅ Outlet created successfully:', outlet);

    return NextResponse.json(
      ResponseBuilder.success('OUTLET_CREATED_SUCCESS', outlet)
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
 * Update an outlet
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const PUT = withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user }) => {
  console.log(`🔍 PUT /api/outlets - User: ${user.email} (${user.role})`);
  
  try {
    const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
    
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

    // Get existing outlet
    const existingOutlet = await db.outlet.findUnique({
      where: { id }
    });
    if (!existingOutlet) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check if trying to deactivate default outlet
    if (parsed.data.isActive === false && existingOutlet.isDefault) {
      return NextResponse.json(
        ResponseBuilder.error('CANNOT_DELETE_DEFAULT_OUTLET'),
        { status: 409 }
      );
    }

    // Check for duplicate outlet name if name is being updated (NO merchantId)
    if (parsed.data.name && parsed.data.name !== existingOutlet.name) {
      const duplicateOutlet = await db.outlet.findFirst({
        where: {
          name: parsed.data.name,
          isActive: true,
          id: { not: id }
        }
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
    
    // Update outlet using Prisma
    const updatedOutlet = await db.outlet.update({
      where: { id },
      data: updateData as any
    });
    console.log('✅ Outlet updated successfully:', updatedOutlet);

    return NextResponse.json(
      ResponseBuilder.success('OUTLET_UPDATED_SUCCESS', updatedOutlet)
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
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const DELETE = withAuthRoles(['ADMIN', 'MERCHANT'])(async (request, { user }) => {
  console.log(`🔍 DELETE /api/outlets - User: ${user.email} (${user.role})`);
  
  try {
    const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
    
    // Extract id from query params
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || searchParams.get('outletId') || '0');

    if (!id) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_ID_REQUIRED'),
        { status: 400 }
      );
    }

    // Get existing outlet
    const existingOutlet = await db.outlet.findUnique({
      where: { id }
    });
    if (!existingOutlet) {
      return NextResponse.json(
        ResponseBuilder.error('OUTLET_NOT_FOUND'),
        { status: 404 }
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
    const deletedOutlet = await db.outlet.update({
      where: { id },
      data: { isActive: false }
    });
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