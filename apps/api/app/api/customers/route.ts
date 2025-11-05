import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getTenantDbFromRequest } from '@rentalshop/utils/api';
import { customersQuerySchema, customerCreateSchema, customerUpdateSchema, assertPlanLimit, handleApiError, ResponseBuilder } from '@rentalshop/utils/api';
import { searchRateLimiter } from '@rentalshop/middleware';
import { API } from '@rentalshop/constants';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/customers
 * Get customers with filtering and pagination
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user }) => {
  console.log(`🔍 GET /api/customers - User: ${user.email} (${user.role})`);
  
  try {
    const result = await getTenantDbFromRequest(request);
      
      if (!result) {
        return NextResponse.json(
          ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
          { status: 400 }
        );
      }
      
      const { db } = result;
    
    // Apply rate limiting
    const rateLimitResult = searchRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    const { searchParams } = new URL(request.url);
    console.log('Search params:', Object.fromEntries(searchParams.entries()));
    
    const parsed = customersQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      console.log('Validation error:', parsed.error.flatten());
      return NextResponse.json({ 
        success: false, 
        code: 'INVALID_QUERY',
        message: 'Invalid query', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { 
      page, 
      limit, 
      q, 
      search, 
      merchantId, // Ignore in multi-tenant
      outletId,
      isActive,
      city,
      state,
      country
    } = parsed.data;

    console.log('Parsed filters:', { 
      page, limit, q, search, outletId, isActive, 
      city, state, country 
    });

    // Build where clause - NO merchantId needed
    const where: any = {};
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    
    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }
    
    if (state) {
      where.state = { contains: state, mode: 'insensitive' };
    }
    
    if (country) {
      where.country = { contains: country, mode: 'insensitive' };
    }
    
    // Search functionality
    const searchTerm = q || search;
    if (searchTerm) {
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    const pageNum = page || 1;
    const limitNum = limit || 20;
    const offset = (pageNum - 1) * limitNum;
    
    console.log('🔍 Using Prisma with where clause:', where);
    
    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        skip: offset
      }),
      db.customer.count({ where })
    ]);
    console.log('✅ Search completed, found:', customers.length, 'customers');

    // Create response body for ETag calculation
    const responseData = {
      success: true,
      data: {
        customers: customers || [],
        total: total,
        page: pageNum,
        limit: limitNum,
        hasMore: pageNum * limitNum < total,
        totalPages: Math.ceil(total / limitNum)
      }
    };

    const bodyString = JSON.stringify(responseData);
    const etag = crypto.createHash('sha1').update(bodyString).digest('hex');
    const ifNoneMatch = request.headers.get('if-none-match');

    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: { ETag: etag, 'Cache-Control': 'private, max-age=5' },
      });
    }

    return new NextResponse(bodyString, {
      status: API.STATUS.OK,
      headers: {
        'Content-Type': 'application/json',
        ETag: etag,
        'Cache-Control': 'private, max-age=5',
      },
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      ResponseBuilder.error('INTERNAL_SERVER_ERROR'),
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

/**
 * POST /api/customers
 * Create a new customer
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user }) => {
  console.log(`🔍 POST /api/customers - User: ${user.email} (${user.role})`);
  
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
    const parsed = customerCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        code: 'INVALID_PAYLOAD',
        message: 'Invalid payload', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    // Check for duplicate phone or email (no merchantId needed - DB is isolated)
    if (parsed.data.phone || parsed.data.email) {
      const duplicateConditions = [];
      
      if (parsed.data.phone) {
        duplicateConditions.push({ phone: parsed.data.phone });
      }
      
      if (parsed.data.email) {
        duplicateConditions.push({ email: parsed.data.email });
      }

      const duplicateCustomer = await db.customer.findFirst({
        where: {
          OR: duplicateConditions
        }
      });

      if (duplicateCustomer) {
        const duplicateField = duplicateCustomer.phone === parsed.data.phone ? 'phone number' : 'email';
        const duplicateValue = duplicateCustomer.phone === parsed.data.phone ? parsed.data.phone : parsed.data.email;
        
        console.log('❌ Customer duplicate found:', { field: duplicateField, value: duplicateValue });
        return NextResponse.json(
          {
            success: false,
            code: 'CUSTOMER_DUPLICATE',
            message: `A customer with this ${duplicateField} (${duplicateValue}) already exists. Please use a different ${duplicateField}.`
          },
          { status: 409 }
        );
      }
    }

    // Remove merchantId from data if present (schema validation may still include it)
    const { merchantId: _, ...customerData } = parsed.data;
    
    console.log('🔍 Creating customer with data:', customerData);
    
    // Create customer using Prisma (NO merchantId) - cast to bypass type checking
    const customer = await db.customer.create({
      data: customerData as any
    });
    console.log('✅ Customer created successfully:', customer);

    return NextResponse.json({
      success: true,
      data: customer,
      code: 'CUSTOMER_CREATED_SUCCESS',
      message: 'Customer created successfully'
    });

  } catch (error: any) {
    console.error('Error in POST /api/customers:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        ResponseBuilder.error('CUSTOMER_DUPLICATE'),
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      ResponseBuilder.error('CREATE_CUSTOMER_FAILED'),
      { status: 500 }
    );
  }
});

/**
 * PUT /api/customers/:id
 * Update a customer
 * MULTI-TENANT: Uses subdomain-based tenant DB
 */
export const PUT = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user }) => {
  console.log(`🔍 PUT /api/customers - User: ${user.email} (${user.role})`);
  
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
    const parsed = customerUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        code: 'INVALID_PAYLOAD',
        message: 'Invalid payload', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    // Extract id from query params since it's not in schema
    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get('id') || '0');

    if (!id) {
      return NextResponse.json(
        ResponseBuilder.error('CUSTOMER_ID_REQUIRED'),
        { status: 400 }
      );
    }

    // Get existing customer (no merchantId needed - DB is isolated)
    const existingCustomer = await db.customer.findUnique({
      where: { id }
    });
    if (!existingCustomer) {
      return NextResponse.json(
        ResponseBuilder.error('CUSTOMER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check for duplicate phone or email if being updated
    if (parsed.data.phone || parsed.data.email) {
      const duplicateConditions = [];
      
      if (parsed.data.phone && parsed.data.phone !== existingCustomer.phone) {
        duplicateConditions.push({ phone: parsed.data.phone });
      }
      
      if (parsed.data.email && parsed.data.email !== existingCustomer.email) {
        duplicateConditions.push({ email: parsed.data.email });
      }

      if (duplicateConditions.length > 0) {
        const duplicateCustomer = await db.customer.findFirst({
          where: {
            OR: duplicateConditions,
            NOT: { id: id }
          }
        });

        if (duplicateCustomer) {
          const duplicateField = duplicateCustomer.phone === parsed.data.phone ? 'phone number' : 'email';
          const duplicateValue = duplicateCustomer.phone === parsed.data.phone ? parsed.data.phone : parsed.data.email;
          
          console.log('❌ Customer duplicate found:', { field: duplicateField, value: duplicateValue });
          return NextResponse.json(
            {
              success: false,
              code: 'CUSTOMER_DUPLICATE',
              message: `A customer with this ${duplicateField} (${duplicateValue}) already exists. Please use a different ${duplicateField}.`
            },
            { status: 409 }
          );
        }
      }
    }

    console.log('🔍 Updating customer with data:', { id, ...parsed.data });
    
    // Update customer using Prisma
    const updatedCustomer = await db.customer.update({
      where: { id },
      data: parsed.data
    });
    console.log('✅ Customer updated successfully:', updatedCustomer);

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      code: 'CUSTOMER_UPDATED_SUCCESS',
      message: 'Customer updated successfully'
    });

  } catch (error: any) {
    console.error('Error in PUT /api/customers:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        ResponseBuilder.error('CUSTOMER_DUPLICATE'),
        { status: 409 }
      );
    }
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
