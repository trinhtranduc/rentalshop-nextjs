import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { verifyTokenSimple } from '@rentalshop/auth';
import { 
  getCustomers, 
  createCustomer, 
  getCustomerById, 
  updateCustomer, 
  searchCustomers
} from '@rentalshop/database';
import { customersQuerySchema, customerCreateSchema, customerUpdateSchema } from '@rentalshop/utils';
import { assertAnyRole, getUserScope } from '@rentalshop/auth';
import type { CustomerFilters, CustomerInput, CustomerUpdateInput, CustomerSearchFilter } from '@rentalshop/types';
import { searchRateLimiter } from '../../../lib/middleware/rateLimit';
import { PrismaClient } from '@prisma/client';

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
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    console.log('Token received:', token ? 'Yes' : 'No');
    
    if (!token) {
      console.log('No token provided');
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    console.log('Verifying token...');
    const user = await verifyTokenSimple(token);
    console.log('User verification result:', user ? 'Success' : 'Failed');
    
    if (!user) {
      console.log('Invalid token');
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    // Get merchantId from user
    const userMerchantId = getUserScope(user as any).merchantId;
    console.log('User merchant ID:', userMerchantId);

    const { searchParams } = new URL(request.url);
    
    // Handle specific customer lookup
    const customerId = searchParams.get('customerId');
    if (customerId) {
      const customer = await getCustomerById(customerId);
      if (!customer) {
        return NextResponse.json(
          { success: false, message: 'Customer not found' },
          { status: 404 }
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
        filters.merchantId = merchantId;
      } else if (userMerchantId) {
        filters.merchantId = userMerchantId;
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
        
        // Transform search results: internal id → public id as "id"
        if (result.success && result.data?.customers) {
          const transformedResult = {
            ...result,
            data: {
              ...result.data,
              customers: result.data.customers.map(customer => ({
                id: customer.publicId,                    // Return publicId as "id" to frontend
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
                phone: customer.phone,
                address: customer.address,
                city: customer.city,
                state: customer.state,
                zipCode: customer.zipCode,
                country: customer.country,
                dateOfBirth: customer.dateOfBirth,
                idNumber: customer.idNumber,
                idType: customer.idType,
                notes: customer.notes,
                isActive: customer.isActive,
                createdAt: customer.createdAt,
                updatedAt: customer.updatedAt,
                merchant: customer.merchant,
                // DO NOT include customer.id (internal CUID)
              }))
            }
          };
          return NextResponse.json(transformedResult);
        }
        
        return NextResponse.json(result);
      } catch (error) {
        console.error('Error in searchCustomers:', error);
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return NextResponse.json(
          { success: false, message: 'Search failed', error: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // Standard customer listing with filters (merchant/outlet scoped)
    const parsed = customersQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid query', error: parsed.error.flatten() }, { status: 400 });
    }

    const { merchantId, isActive, search, city, state, country, idType, page, limit } = parsed.data as any;

    // Build filters
    const filters: CustomerFilters = {};

    // Use user's merchantId if not provided in params
    if (merchantId) {
      filters.merchantId = merchantId;
    } else if (userMerchantId) {
      filters.merchantId = userMerchantId;
    }

    if (isActive !== undefined) {
      filters.isActive = Boolean(isActive);
    }

    if (search) {
      filters.search = search;
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
      // Authorization: ADMIN, MERCHANT, OUTLET team can read
      assertAnyRole(user as any, ['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']);
      // Get customers
      const result = await getCustomers(filters, page, limit);

      // Transform response: internal id → public id as "id"
      const transformedResult = {
        ...result,
        customers: result.customers.map(customer => ({
          id: customer.publicId,                    // Return publicId as "id" to frontend
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zipCode,
          country: customer.country,
          dateOfBirth: customer.dateOfBirth,
          idNumber: customer.idNumber,
          idType: customer.idType,
          notes: customer.notes,
          isActive: customer.isActive,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
          merchant: customer.merchant,
          // DO NOT include customer.id (internal CUID)
        }))
      };

      const bodyString = JSON.stringify({ success: true, data: transformedResult });
      const etag = crypto.createHash('sha1').update(bodyString).digest('hex');
      const ifNoneMatch = request.headers.get('if-none-match');

      if (ifNoneMatch && ifNoneMatch === etag) {
        return new NextResponse(null, {
          status: 304,
          headers: { ETag: etag, 'Cache-Control': 'private, max-age=60' },
        });
      }

      return new NextResponse(bodyString, {
        status: 200,
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
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
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
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

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
            { status: 409 }
          );
        } else if (error.message.includes('email')) {
          return NextResponse.json(
            { 
              success: false, 
              message: 'A customer with this email address already exists',
              error: 'DUPLICATE_EMAIL'
            },
            { status: 409 }
          );
        }
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/customers
 * Update a customer (requires customerId in query params)
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
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

    // Check if customer exists
    const existingCustomer = await getCustomerById(customerId);
    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
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
      ...(payload.idNumber !== undefined && { idNumber: payload.idNumber?.trim() }),
      ...(payload.idType !== undefined && { idType: payload.idType }),
      ...(payload.notes !== undefined && { notes: payload.notes?.trim() }),
      ...(payload.isActive !== undefined && { isActive: payload.isActive }),
    };

    // Update customer
    const customer = await updateCustomer(customerId, updateData);

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer updated successfully'
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customers
 * Delete a customer (requires customerId in query params)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Access token required' },
        { status: 401 }
      );
    }

    const user = await verifyTokenSimple(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
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

    // Check if customer exists
    const existingCustomer = await getCustomerById(customerId);
    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if customer has active orders or other dependencies
    const hasActiveOrders = await prisma.order.findFirst({
      where: { 
        customerId: customerId
      }
    });

    if (hasActiveOrders) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete customer with active orders' },
        { status: 400 }
      );
    }

    // Delete customer from database
    await prisma.customer.delete({
      where: { id: customerId }
    });

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 