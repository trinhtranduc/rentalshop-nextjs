import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { customersQuerySchema, customerCreateSchema, customerUpdateSchema, assertPlanLimit, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { searchRateLimiter } from '@rentalshop/middleware';
import { API } from '@rentalshop/constants';
import crypto from 'crypto';

/**
 * GET /api/customers
 * Get customers with filtering and pagination using simplified database API
 * REFACTORED: Now uses unified withAuth pattern
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  console.log(`🔍 GET /api/customers - User: ${user.email} (${user.role})`);
  
  try {
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
        code: 'INVALID_QUERY', message: 'Invalid query', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    const { 
      page, 
      limit, 
      q, 
      search, 
      merchantId,
      isActive,
      city,
      state,
      country
    } = parsed.data;

    console.log('Parsed filters:', { 
      page, limit, q, search, merchantId, isActive, 
      city, state, country 
    });

    // Determine merchantId for filtering
    let filterMerchantId = userScope.merchantId;
    
    // For ADMIN users, they can specify merchantId in query to view other merchants' customers
    // For other roles, use their assigned merchantId
    if (user.role === 'ADMIN' && merchantId) {
      filterMerchantId = merchantId;
    } else if (user.role !== 'ADMIN' && merchantId && merchantId !== userScope.merchantId) {
      // Non-ADMIN users cannot view other merchants' customers
      return NextResponse.json(
        { 
          success: false, 
          code: 'CROSS_MERCHANT_ACCESS_DENIED', message: 'Access denied: Cannot view customers from other merchants' 
        },
        { status: 403 }
      );
    }

    console.log('🔍 Using merchantId for filtering:', filterMerchantId, 'for user role:', user.role);

    // Build search filters for customer search
    const searchFilters = {
      merchantId: filterMerchantId,
      isActive,
      city,
      state,
      country,
      search: q || search,
      page: page || 1,
      limit: limit || 20
    };

    console.log('🔍 Using simplified db.customers.search with filters:', searchFilters);

    // Use simplified database API
    const result = await db.customers.search(searchFilters);
    console.log('✅ Search completed, found:', result.total || 0, 'customers');

    // Create response body for ETag calculation
    const responseData = {
      success: true,
      data: {
        customers: result.data || [],
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 20,
        hasMore: result.hasMore || false,
        totalPages: result.totalPages || Math.ceil((result.total || 0) / (result.limit || 20))
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
 * Create a new customer using simplified database API
 * REFACTORED: Now uses unified withAuth pattern
 */
export const POST = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  console.log(`🔍 POST /api/customers - User: ${user.email} (${user.role})`);
  
  try {
    const body = await request.json();
    const parsed = customerCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        code: 'INVALID_PAYLOAD', message: 'Invalid payload', 
        error: parsed.error.flatten() 
      }, { status: 400 });
    }

    // Determine merchantId for customer creation
    let merchantId = userScope.merchantId;
    
    // For ADMIN users, they need to specify merchantId in the request
    // For other roles, use their assigned merchantId
    if (user.role === 'ADMIN' && parsed.data.merchantId) {
      merchantId = parsed.data.merchantId;
    } else if (!merchantId) {
      return NextResponse.json(
        { 
          success: false, 
          code: 'MERCHANT_ID_REQUIRED',
          message: user.role === 'ADMIN' 
            ? 'MerchantId is required for ADMIN users when creating customers' 
            : 'User is not associated with any merchant'
        },
        { status: 400 }
      );
    }

    console.log('🔍 Using merchantId:', merchantId, 'for user role:', user.role);

    // Check plan limits before creating customer
    try {
      await assertPlanLimit(merchantId, 'customers');
      console.log('✅ Plan limit check passed for customers');
    } catch (error: any) {
      console.log('❌ Plan limit exceeded for customers:', error.message);
      return NextResponse.json(
        { 
          success: false, 
          code: 'PLAN_LIMIT_EXCEEDED', message: error.message || 'Plan limit exceeded for customers',
          error: 'PLAN_LIMIT_EXCEEDED'
        },
        { status: 403 }
      );
    }

    // Find merchant by publicId to get CUID
    const merchant = await db.merchants.findById(merchantId);

    if (!merchant) {
      throw new Error(`Merchant with ID ${merchantId} not found`);
    }

    // Use merchant CUID for customer creation
    const customerData = {
      ...parsed.data,
      merchantId: merchant.id // Use CUID, not publicId
    };

    console.log('🔍 Creating customer with data:', customerData);
    
    // Use simplified database API
    const customer = await db.customers.create(customerData);
    console.log('✅ Customer created successfully:', customer);

    return NextResponse.json({
      success: true,
      data: customer,
      code: 'CUSTOMER_CREATED_SUCCESS', message: 'Customer created successfully'
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
 * Update a customer using simplified database API  
 * REFACTORED: Now uses unified withAuth pattern
 */
export const PUT = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(async (request, { user, userScope }) => {
  console.log(`🔍 PUT /api/customers - User: ${user.email} (${user.role})`);
  
  try {
    const body = await request.json();
    const parsed = customerUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ 
        success: false, 
        code: 'INVALID_PAYLOAD', message: 'Invalid payload', 
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

    // Get existing customer to check permissions
    const existingCustomer = await db.customers.findById(id);
    if (!existingCustomer) {
      return NextResponse.json(
        ResponseBuilder.error('CUSTOMER_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Check if user can access this customer (ADMIN can access all customers)
    if (user.role !== 'ADMIN' && existingCustomer.merchantId !== userScope.merchantId) {
      return NextResponse.json(
        ResponseBuilder.error('FORBIDDEN'),
        { status: 403 }
      );
    }

    console.log('🔍 Updating customer with data:', { id, ...parsed.data });
    
    // Use simplified database API
    const updatedCustomer = await db.customers.update(id, parsed.data);
    console.log('✅ Customer updated successfully:', updatedCustomer);

    return NextResponse.json({
      success: true,
      data: updatedCustomer,
      code: 'CUSTOMER_UPDATED_SUCCESS', message: 'Customer updated successfully'
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
