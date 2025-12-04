import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { 
  customersQuerySchema, 
  customerCreateSchema, 
  customerUpdateSchema, 
  assertPlanLimit, 
  handleApiError, 
  ResponseBuilder
} from '@rentalshop/utils';
import { searchRateLimiter } from '@rentalshop/middleware';
import { API, USER_ROLE } from '@rentalshop/constants';
import crypto from 'crypto';
import { z } from 'zod';

// Helper functions (will be available from @rentalshop/utils after rebuild)
function parseQueryParams<T>(request: NextRequest, schema: any): { success: true; data: T } | { success: false; response: NextResponse } {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = schema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return {
        success: false,
        response: NextResponse.json(
          ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
          { status: 400 }
        )
      };
    }
    return { success: true, data: parsed.data as T };
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    return {
      success: false,
      response: NextResponse.json(response, { status: statusCode })
    };
  }
}

async function parseRequestBody<T>(request: NextRequest, schema: any): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return {
        success: false,
        response: NextResponse.json(
          ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten()),
          { status: 400 }
        )
      };
    }
    return { success: true, data: parsed.data as T };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        response: NextResponse.json(
          ResponseBuilder.error('INVALID_JSON', 'Invalid JSON in request body'),
          { status: 400 }
        )
      };
    }
    const { response, statusCode } = handleApiError(error);
    return {
      success: false,
      response: NextResponse.json(response, { status: statusCode })
    };
  }
}

function createETagResponse(data: any, request: NextRequest, status: number = API.STATUS.OK) {
  const bodyString = JSON.stringify(data);
  const etag = crypto.createHash('sha1').update(bodyString).digest('hex');
  const ifNoneMatch = request.headers.get('if-none-match');

  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': 'private, max-age=5' }
    });
  }

  return new NextResponse(bodyString, {
    status,
    headers: {
      'Content-Type': 'application/json',
      ETag: etag,
      'Cache-Control': 'private, max-age=5'
    }
  });
}

function resolveMerchantId(user: any, userScope: any, requestedMerchantId?: number) {
  if (user.role === USER_ROLE.ADMIN && requestedMerchantId) {
    return { success: true as const, merchantId: requestedMerchantId };
  }
  if (userScope.merchantId) {
    if (requestedMerchantId && requestedMerchantId !== userScope.merchantId) {
      return {
        success: false as const,
        response: NextResponse.json(
          ResponseBuilder.error('CROSS_MERCHANT_ACCESS_DENIED'),
          { status: 403 }
        )
      };
    }
    return { success: true as const, merchantId: userScope.merchantId };
  }
  return {
    success: false as const,
    response: NextResponse.json(
      ResponseBuilder.error('MERCHANT_ID_REQUIRED'),
      { status: 400 }
    )
  };
}

/**
 * GET /api/customers
 * Get customers with filtering and pagination using simplified database API
 * 
 * Authorization: All roles with 'customers.view' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const GET = withPermissions(['customers.view'])(async (request, { user, userScope }) => {
  console.log(`🔍 GET /api/customers - User: ${user.email} (${user.role})`);
  
  try {
    // Apply rate limiting
    const rateLimitResult = searchRateLimiter(request);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // Parse and validate query parameters
    const queryResult = parseQueryParams<z.infer<typeof customersQuerySchema>>(request, customersQuerySchema);
    if (!queryResult.success) {
      return queryResult.response;
    }

    const { 
      page, 
      limit, 
      q, 
      search, 
      merchantId,
      outletId,
      isActive,
      city,
      state,
      country
    } = queryResult.data;

    // Resolve merchantId using helper
    const merchantResult = resolveMerchantId(user, userScope, merchantId);
    if (!merchantResult.success) {
      return merchantResult.response;
    }

    const filterMerchantId = merchantResult.merchantId;
    console.log('🔍 Using merchantId for filtering:', filterMerchantId, 'for user role:', user.role);

    // Build search filters
    const searchFilters = {
      merchantId: filterMerchantId,
      outletId,
      isActive,
      city,
      state,
      country,
      search: q || search,
      page: page || 1,
      limit: limit || 20
    };

    // Use simplified database API
    const result = await db.customers.search(searchFilters);
    console.log('✅ Search completed, found:', result.total || 0, 'customers');

    // Normalize date fields in customer list to UTC ISO strings using toISOString()
    const normalizedCustomers = (result.data || []).map(customer => ({
      ...customer,
      createdAt: customer.createdAt?.toISOString() || null,
      updatedAt: customer.updatedAt?.toISOString() || null,
      dateOfBirth: customer.dateOfBirth?.toISOString() || null,
    }));

    // Create response with ETag support
    const responseData = {
      success: true,
      data: {
        customers: normalizedCustomers,
        total: result.total || 0,
        page: result.page || 1,
        limit: result.limit || 20,
        hasMore: result.hasMore || false,
        totalPages: result.totalPages || Math.ceil((result.total || 0) / (result.limit || 20))
      }
    };

    return createETagResponse(responseData, request);

  } catch (error) {
    console.error('Error fetching customers:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * POST /api/customers
 * Create a new customer using simplified database API
 * REFACTORED: Now uses unified withAuth pattern
 */
/**
 * POST /api/customers
 * Create a new customer
 * 
 * Authorization: All roles with 'customers.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const POST = withPermissions(['customers.manage'])(async (request, { user, userScope }) => {
  console.log(`🔍 POST /api/customers - User: ${user.email} (${user.role})`);
  
  try {
    // Parse and validate request body
    const bodyResult = await parseRequestBody<z.infer<typeof customerCreateSchema>>(request, customerCreateSchema);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const parsed = bodyResult.data;

    // Resolve merchantId using helper
    const merchantResult = resolveMerchantId(user, userScope, parsed.merchantId);
    if (!merchantResult.success) {
      return merchantResult.response;
    }

    const merchantId = merchantResult.merchantId;
    console.log('🔍 Using merchantId:', merchantId, 'for user role:', user.role);

    // Check for duplicate phone or email within the same merchant
    // Only check if phone/email are provided, not empty, and have meaningful content
    // Handle both empty string "" and null/undefined
    const phoneValue = parsed.phone ? String(parsed.phone).trim() : '';
    const emailValue = parsed.email ? String(parsed.email).trim() : '';
    const hasPhone = phoneValue.length > 0;
    const hasEmail = emailValue.length > 0;
    
    console.log('🔍 Duplicate check:', { 
      phoneValue, 
      emailValue, 
      hasPhone, 
      hasEmail,
      phoneType: typeof parsed.phone,
      emailType: typeof parsed.email
    });
    
    // Only perform duplicate check if at least one field (phone or email) is provided
    if (hasPhone || hasEmail) {
      const duplicateConditions = [];
      
      if (hasPhone) {
        duplicateConditions.push({ phone: phoneValue });
      }
      
      if (hasEmail) {
        duplicateConditions.push({ email: emailValue });
      }

      if (duplicateConditions.length > 0) {
        const duplicateCustomer = await db.customers.findFirst({
          merchantId: merchantId,
          OR: duplicateConditions
        });

        if (duplicateCustomer) {
          // Determine which field caused the duplicate
          const isPhoneDuplicate = hasPhone && duplicateCustomer.phone === phoneValue;
          const duplicateField = isPhoneDuplicate ? 'phone number' : 'email';
          const duplicateValue = isPhoneDuplicate ? phoneValue : emailValue;
          
          console.log('❌ Customer duplicate found:', { field: duplicateField, value: duplicateValue });
          return NextResponse.json(
            ResponseBuilder.error('CUSTOMER_DUPLICATE', `A customer with this ${duplicateField} (${duplicateValue}) already exists. Please use a different ${duplicateField}.`),
            { status: 409 }
          );
        }
      }
    }
    
    // If no phone or email provided, allow creation (name can be duplicate)
    console.log('✅ No duplicate check needed - phone and email are both empty or not provided');

    // Check plan limits before creating customer (ADMIN bypass)
    if (user.role !== USER_ROLE.ADMIN) {
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
    } else {
      console.log('✅ ADMIN user: Bypassing plan limit check for customers');
    }

    // Find merchant by publicId to get CUID
    const merchant = await db.merchants.findById(merchantId);

    if (!merchant) {
      throw new Error(`Merchant with ID ${merchantId} not found`);
    }

    // Use merchant CUID for customer creation
    const customerData = {
      ...parsed,
      merchantId: merchant.id // Use CUID, not publicId
    };

    console.log('🔍 Creating customer with data:', customerData);
    
    // Use simplified database API
    const customer = await db.customers.create(customerData);
    console.log('✅ Customer created successfully:', customer);

    // Normalize date fields to UTC ISO strings using toISOString()
    const normalizedCustomer = {
      ...customer,
      createdAt: customer.createdAt?.toISOString() || null,
      updatedAt: customer.updatedAt?.toISOString() || null,
      dateOfBirth: customer.dateOfBirth?.toISOString() || null,
    };

    return NextResponse.json(
      ResponseBuilder.success('CUSTOMER_CREATED_SUCCESS', normalizedCustomer),
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error in POST /api/customers:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        ResponseBuilder.error('CUSTOMER_DUPLICATE'),
        { status: 409 }
      );
    }
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * PUT /api/customers/:id
 * Update a customer using simplified database API  
 * REFACTORED: Now uses unified withAuth pattern
 */
/**
 * PUT /api/customers
 * Update a customer
 * 
 * Authorization: All roles with 'customers.manage' permission can access
 * - Automatically includes: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
 * - Single source of truth: ROLE_PERMISSIONS in packages/auth/src/core.ts
 */
export const PUT = withPermissions(['customers.manage'])(async (request, { user, userScope }) => {
  console.log(`🔍 PUT /api/customers - User: ${user.email} (${user.role})`);
  
  try {
    // Parse and validate request body
    const bodyResult = await parseRequestBody<z.infer<typeof customerUpdateSchema>>(request, customerUpdateSchema);
    if (!bodyResult.success) {
      return bodyResult.response;
    }

    const parsed = bodyResult.data;

    // Extract id from query params
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
    if (user.role !== USER_ROLE.ADMIN && existingCustomer.merchantId !== userScope.merchantId) {
      return NextResponse.json(
        ResponseBuilder.error('FORBIDDEN'),
        { status: 403 }
      );
    }

    // Check for duplicate phone or email if being updated
    // Only check if phone/email are provided, not empty, and different from existing
    // Handle both empty string "" and null/undefined
    const phoneValue = parsed.phone ? String(parsed.phone).trim() : '';
    const emailValue = parsed.email ? String(parsed.email).trim() : '';
    const hasPhone = phoneValue.length > 0;
    const hasEmail = emailValue.length > 0;
    
    console.log('🔍 PUT Duplicate check:', { 
      phoneValue, 
      emailValue, 
      hasPhone, 
      hasEmail,
      phoneType: typeof parsed.phone,
      emailType: typeof parsed.email
    });
    
    // Only perform duplicate check if at least one field (phone or email) is provided and changed
    if (hasPhone || hasEmail) {
      const duplicateConditions = [];
      
      if (hasPhone && phoneValue !== existingCustomer.phone) {
        duplicateConditions.push({ phone: phoneValue });
      }
      
      if (hasEmail && emailValue !== existingCustomer.email) {
        duplicateConditions.push({ email: emailValue });
      }

      if (duplicateConditions.length > 0) {
        const duplicateCustomer = await db.customers.findFirst({
          merchantId: existingCustomer.merchantId,
          OR: duplicateConditions,
          id: { not: id }
        });

        if (duplicateCustomer) {
          // Determine which field caused the duplicate
          const isPhoneDuplicate = hasPhone && duplicateCustomer.phone === phoneValue;
          const duplicateField = isPhoneDuplicate ? 'phone number' : 'email';
          const duplicateValue = isPhoneDuplicate ? phoneValue : emailValue;
          
          console.log('❌ Customer duplicate found:', { field: duplicateField, value: duplicateValue });
          return NextResponse.json(
            ResponseBuilder.error('CUSTOMER_DUPLICATE', `A customer with this ${duplicateField} (${duplicateValue}) already exists. Please use a different ${duplicateField}.`),
            { status: 409 }
          );
        }
      }
    }
    
    // If no phone or email provided, allow update (name can be duplicate)
    console.log('✅ No duplicate check needed - phone and email are both empty or not provided');

    console.log('🔍 Updating customer with data:', { id, ...parsed });
    
    // Use simplified database API
    const updatedCustomer = await db.customers.update(id, parsed);
    console.log('✅ Customer updated successfully:', updatedCustomer);

    // Normalize date fields to UTC ISO strings using toISOString()
    const normalizedCustomer = {
      ...updatedCustomer,
      createdAt: updatedCustomer.createdAt?.toISOString() || null,
      updatedAt: updatedCustomer.updatedAt?.toISOString() || null,
      dateOfBirth: updatedCustomer.dateOfBirth?.toISOString() || null,
    };

    return NextResponse.json(
      ResponseBuilder.success('CUSTOMER_UPDATED_SUCCESS', normalizedCustomer)
    );

  } catch (error: any) {
    console.error('Error in PUT /api/customers:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        ResponseBuilder.error('CUSTOMER_DUPLICATE'),
        { status: 409 }
      );
    }
    
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
