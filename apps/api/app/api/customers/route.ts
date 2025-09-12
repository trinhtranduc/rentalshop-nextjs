import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { authenticateRequest } from '@rentalshop/auth';
import { 
  createCustomer, 
  getCustomerByPublicId, 
  updateCustomer, 
  searchCustomers
} from '@rentalshop/database';
import { customersQuerySchema, customerCreateSchema, customerUpdateSchema } from '@rentalshop/utils';
import { assertAnyRole, getUserScope } from '@rentalshop/auth';
import type { CustomerFilters, CustomerInput, CustomerUpdateInput, CustomerSearchFilter } from '@rentalshop/types';
import { searchRateLimiter } from '@rentalshop/middleware';
import { PrismaClient } from '@prisma/client';
// import { AuditLogger } from '../../../../packages/database/src/audit';
import { captureAuditContext, getAuditContext } from '@rentalshop/middleware';
import { createAuditHelper } from '@rentalshop/utils';
import {API} from '@rentalshop/constants';

const prisma = new PrismaClient();

/**
 * GET /api/customers
 * Get customers with filtering, pagination, and special operations
 * 
 * Query Parameters:
 * - Standard filters: merchantId, isActive, search, city, state, country, idType
 * - Pagination: page, limit
 * - Special operations:
 *   - customerId: Get specific customer
 *   - search: Advanced search functionality
 */
export async function GET(request: NextRequest) {
  console.log('GET /api/customers called');
  
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      console.log('Authentication failed');
      return authResult.response;
    }

    const user = authResult.user;
    console.log('User verification result: Success');

    // Get merchantId from user and convert to number
    const userMerchantId = getUserScope(user as any).merchantId;
    const userMerchantIdNumber = userMerchantId ? userMerchantId : undefined;
    console.log('User merchant ID:', userMerchantIdNumber);

    const { searchParams } = new URL(request.url);
    
    // Handle specific customer lookup
    const customerId = searchParams.get('customerId');
    if (customerId) {
      const customerIdNumber = parseInt(customerId);
      if (isNaN(customerIdNumber)) {
        return NextResponse.json(
          { success: false, message: 'Invalid customer ID format' },
          { status: 400 }
        );
      }
      
      const customer = await getCustomerByPublicId(customerIdNumber, userMerchantIdNumber || 0);
      if (!customer) {
        return NextResponse.json(
          { success: false, message: 'Customer not found' },
          { status: API.STATUS.NOT_FOUND }
        );
      }
      return NextResponse.json({
        success: true,
        data: customer
      });
    }
    
    // Handle search functionality
    const searchQuery = searchParams.get('search') || searchParams.get('q');
    if (searchQuery) {
      // Apply rate limiting for search operations
      // const rateLimitResult = searchRateLimiter(request);
      // if (rateLimitResult instanceof NextResponse) {
      //   return rateLimitResult;
      // }
      
      const merchantId = searchParams.get('merchantId');
      const isActive = searchParams.get('isActive');
      const city = searchParams.get('city');
      const state = searchParams.get('state');
      const country = searchParams.get('country');
      const idType = searchParams.get('idType') as any;
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = parseInt(searchParams.get('offset') || '0');

      // Validate limit
      if (limit < 1 || limit > 100) {
        return NextResponse.json(
          { success: false, message: 'Limit must be between 1 and 100' },
          { status: 400 }
        );
      }

      // Validate offset
      if (offset < 0) {
        return NextResponse.json(
          { success: false, message: 'Offset must be 0 or greater' },
          { status: 400 }
        );
      }

      // Build search filters
      const filters: CustomerSearchFilter = {
        limit,
        offset
      };

      if (searchQuery) {
        filters.q = searchQuery;
      }

      // Use user's merchantId if not provided in params
      if (merchantId) {
        filters.merchantId = parseInt(merchantId);
      } else if (userMerchantIdNumber) {
        filters.merchantId = userMerchantIdNumber;
      }

      if (isActive !== null && isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }

      if (city) {
        filters.city = city;
      }

      if (state) {
        filters.state = state;
      }

      if (country) {
        filters.country = country;
      }

      if (idType) {
        filters.idType = idType;
      }

      try {
        console.log('Search filters:', JSON.stringify(filters, null, 2));
        // Search customers
        const result = await searchCustomers(filters);
        console.log('Search result:', JSON.stringify(result, null, 2));
        
        // Database layer already handles transformation, return result directly
        return NextResponse.json(result);
      } catch (error) {
        console.error('Error in searchCustomers:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return NextResponse.json(
          { success: false, message: 'Search failed', error: error instanceof Error ? error.message : 'Unknown error' },
          { status: API.STATUS.INTERNAL_SERVER_ERROR }
        );
      }
    }

    // Standard customer listing with filters (merchant/outlet scoped)
    const parsed = customersQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid query', error: parsed.error.flatten() }, { status: 400 });
    }

    const { 
      merchantId, 
      isActive, 
      q, 
      search, 
      city, 
      state, 
      country, 
      idType, 
      page, 
      limit, 
      offset,
      sortBy,
      sortOrder
    } = parsed.data as any;

    // Build filters
    const filters: CustomerFilters = {};

    // Use user's merchantId if not provided in params
    if (merchantId) {
      filters.merchantId = merchantId;
    } else if (userMerchantIdNumber) {
      filters.merchantId = userMerchantIdNumber;
    }

    if (isActive !== undefined) {
      filters.isActive = Boolean(isActive);
    }

    if (q || search) {
      filters.search = q || search; // Use 'q' parameter first, fallback to 'search' for backward compatibility
    }

    if (city) {
      filters.city = city;
    }

    if (state) {
      filters.state = state;
    }

    if (country) {
      filters.country = country;
    }

    if (idType) {
      filters.idType = idType;
    }

    // Add pagination parameters
    if (limit) filters.limit = limit;
    if (offset !== undefined) filters.offset = offset;
    if (page) filters.page = page;

    // Add sorting parameters
    if (sortBy) filters.sortBy = sortBy;
    if (sortOrder) filters.sortOrder = sortOrder;

    try {
      // Authorization: ADMIN, MERCHANT, OUTLET team can read
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
      // Get customers using new dual ID system
      const result = await searchCustomers(filters);

      // The searchCustomers function returns the correct format
      // Transform the response to ensure publicId is properly exposed
      const transformedCustomers = result.data.customers.map(customer => ({
        ...customer,
        publicId: customer.id, // Ensure publicId is available for backward compatibility
        // id is already set to customer.publicId by the database function
      }));

      const bodyString = JSON.stringify({ 
        success: true, 
        data: {
          customers: transformedCustomers,
          total: result.data.total,
          page: result.data.page,
          limit: result.data.limit,
          offset: result.data.offset,
          hasMore: result.data.hasMore,
          totalPages: result.data.totalPages
        }
      });
      const etag = crypto.createHash('sha1').update(bodyString).digest('hex');
      const ifNoneMatch = request.headers.get('if-none-match');

      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, {
          status: 304,
          headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' },
        });
      }

      return new NextResponse(bodyString, {
        status: API.STATUS.OK,
        headers: {
          'Content-Type': 'application/json',
          ETag: etag,
          'Cache-Control': 'private, max-age=60',
        },
      });
    } catch (error) {
      console.error('Error in getCustomers:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch customers', error: error instanceof Error ? error.message : 'Unknown error' },
        { status: API.STATUS.INTERNAL_SERVER_ERROR }
      );
    }

  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export const runtime = 'nodejs';

/**
 * POST /api/customers
 * Create a new customer
 */
export async function POST(request: NextRequest) {
  try {
    // Capture audit context
    const auditContext = await captureAuditContext(request);
    
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Parse request body
    const body = await request.json();
    console.log('🔍 Received customer creation request:', JSON.stringify(body, null, 2));
    
    const parsedBody = customerCreateSchema.safeParse(body);
    if (!parsedBody.success) {
      console.error('❌ Validation failed:', parsedBody.error.flatten());
      return NextResponse.json({ success: false, message: 'Invalid payload', error: parsedBody.error.flatten() }, { status: 400 });
    }
    
    console.log('✅ Validation passed');

    const payload = parsedBody.data;

    const customerData: CustomerInput = {
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email: payload.email && payload.email.trim() ? payload.email.toLowerCase().trim() : undefined,
      phone: payload.phone.trim(),
      merchantId: payload.merchantId,
      address: payload.address?.trim(),
      city: payload.city?.trim(),
      state: payload.state?.trim(),
      zipCode: payload.zipCode?.trim(),
      country: payload.country?.trim(),
      dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : undefined,
      idNumber: payload.idNumber?.trim(),
      idType: payload.idType,
      notes: payload.notes?.trim()
    };

    // Create customer
    console.log('🔍 Creating customer with data:', JSON.stringify(customerData, null, 2));
    
    const customer = await createCustomer(customerData);
    
    console.log('✅ Customer created successfully:', customer);

    // Log audit event using selective audit helper
    try {
      const auditHelper = createAuditHelper(prisma);
      await auditHelper.logCreate({
        entityType: 'Customer',
        entityId: customer.id.toString(),
        entityName: `${customer.firstName} ${customer.lastName}`,
        newValues: customer,
        description: `Customer created: ${customer.firstName} ${customer.lastName}`,
        context: {
          ...auditContext,
          userId: user.id.toString(),
          userEmail: user.email,
          userRole: user.role,
          merchantId: user.merchant?.id?.toString(),
          outletId: user.outlet?.id?.toString()
        }
      });
    } catch (auditError: any) {
      console.error('Failed to log customer creation audit:', auditError);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating customer:', error);
    
    // Handle duplicate phone/email errors specifically
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint failed') || error.message.includes('UNIQUE constraint failed')) {
        if (error.message.includes('phone')) {
          return NextResponse.json(
            { 
              success: false, 
              message: 'A customer with this phone number already exists',
              error: 'DUPLICATE_PHONE'
            },
            { status: API.STATUS.CONFLICT }
          );
        } else if (error.message.includes('email')) {
          return NextResponse.json(
            { 
              success: false, 
              message: 'A customer with this email address already exists',
              error: 'DUPLICATE_EMAIL'
            },
            { status: API.STATUS.CONFLICT }
          );
        }
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * PUT /api/customers
 * Update a customer (requires customerId in query params)
 */
export async function PUT(request: NextRequest) {
  try {
    // Capture audit context
    const auditContext = await captureAuditContext(request);
    
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Get merchantId from user
    const userMerchantId = getUserScope(user as any).merchantId;
    if (!userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'User not associated with any merchant' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Check if customer exists using new dual ID system
    const existingCustomer = await getCustomerByPublicId(parseInt(customerId), userMerchantId);
    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Parse request body
    const body = await request.json();
    const parsedBody = customerUpdateSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({ success: false, message: 'Invalid payload', error: parsedBody.error.flatten() }, { status: 400 });
    }

    const payload = parsedBody.data;

    const updateData: CustomerUpdateInput = {
      ...(payload.firstName !== undefined && { firstName: payload.firstName.trim() }),
      ...(payload.lastName !== undefined && { lastName: payload.lastName.trim() }),
      ...(payload.email !== undefined && { email: payload.email.toLowerCase().trim() }),
      ...(payload.phone !== undefined && { phone: payload.phone.trim() }),
      ...(payload.address !== undefined && { address: payload.address?.trim() }),
      ...(payload.city !== undefined && { city: payload.city?.trim() }),
      ...(payload.state !== undefined && { state: payload.state?.trim() }),
      ...(payload.zipCode !== undefined && { zipCode: payload.zipCode?.trim() }),
      ...(payload.country !== undefined && { country: payload.country?.trim() }),
      ...(payload.dateOfBirth !== undefined && { dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : undefined }),
      ...(payload.idNumber !== undefined && { idType: payload.idType }),
      ...(payload.notes !== undefined && { notes: payload.notes?.trim() }),
      ...(payload.isActive !== undefined && { isActive: payload.isActive }),
    };

    // Update customer using new dual ID system
    const customer = await updateCustomer(parseInt(customerId), updateData);

    // Log audit event using selective audit helper
    console.log('🔍 Customer API - About to log audit event:', {
      entityType: 'Customer',
      entityId: customer.id.toString(),
      hasAuditContext: !!auditContext,
      hasUser: !!user,
      auditContext: auditContext,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        merchantId: user.merchant?.id?.toString(),
        outletId: user.outlet?.id?.toString()
      }
    });
    
    try {
      console.log('🔍 Customer API - Creating audit helper...');
      const auditHelper = createAuditHelper(prisma);
      console.log('✅ Customer API - Audit helper created');
      
      console.log('🔍 Customer API - Calling auditHelper.logUpdate...');
      await auditHelper.logUpdate({
        entityType: 'Customer',
        entityId: customer.id.toString(),
        entityName: `${customer.firstName} ${customer.lastName}`,
        oldValues: existingCustomer,
        newValues: customer,
        description: `Customer updated: ${customer.firstName} ${customer.lastName}`,
        context: {
          ...auditContext,
          userId: user.id.toString(),
          userEmail: user.email,
          userRole: user.role,
          merchantId: user.merchant?.id?.toString(),
          outletId: user.outlet?.id?.toString()
        }
      });
      console.log('✅ Customer API - Audit event logged successfully');
    } catch (auditError: any) {
      console.error('❌ Customer API - Failed to log customer update audit:', auditError);
      console.error('❌ Customer API - Audit error stack:', auditError.stack);
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer updated successfully'
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

/**
 * DELETE /api/customers
 * Delete a customer (requires customerId in query params)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication using centralized middleware
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const user = authResult.user;

    // Get merchantId from user
    const userMerchantId = getUserScope(user as any).merchantId;
    if (!userMerchantId) {
      return NextResponse.json(
        { success: false, message: 'User not associated with any merchant' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Check if customer exists using new dual ID system
    const existingCustomer = await getCustomerByPublicId(parseInt(customerId), userMerchantId);
    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: API.STATUS.NOT_FOUND }
      );
    }

    // Check if customer has active orders or other dependencies
    const hasActiveOrders = await prisma.order.findFirst({
      where: { 
        customerId: existingCustomer.id // Use the CUID from the found customer
      }
    });

    if (hasActiveOrders) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete customer with active orders' },
        { status: 400 }
      );
    }

    // Delete customer from database using CUID
    await prisma.customer.delete({
      where: { id: existingCustomer.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
} 