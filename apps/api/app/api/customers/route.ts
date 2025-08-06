import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { 
  getCustomers, 
  createCustomer, 
  getCustomerById, 
  updateCustomer, 
  deleteCustomer,
  searchCustomers
} from '@rentalshop/database';
import type { CustomerFilters, CustomerInput, CustomerUpdateInput, CustomerSearchFilter } from '@rentalshop/database';
import { searchRateLimiter } from '../../../lib/middleware/rateLimit';

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
      const rateLimitResult = searchRateLimiter(request);
      if (rateLimitResult instanceof NextResponse) {
        return rateLimitResult;
      }
      
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

      if (merchantId) {
        filters.merchantId = merchantId;
      }

      if (isActive !== null) {
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

      // Search customers
      const result = await searchCustomers(filters);
      return NextResponse.json(result);
    }

    // Standard customer listing with filters
    const merchantId = searchParams.get('merchantId');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const country = searchParams.get('country');
    const idType = searchParams.get('idType') as any;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build filters
    const filters: CustomerFilters = {};

    if (merchantId) {
      filters.merchantId = merchantId;
    }

    if (isActive !== null) {
      filters.isActive = isActive === 'true';
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

    // Get customers
    const result = await getCustomers(filters, page, limit);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    // Validate required fields
    const { firstName, lastName, email, phone, merchantId } = body;
    if (!firstName || !lastName || !email || !phone || !merchantId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Missing required fields: firstName, lastName, email, phone, merchantId' 
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create customer data
    const customerData: CustomerInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      merchantId,
      address: body.address?.trim(),
      city: body.city?.trim(),
      state: body.state?.trim(),
      zipCode: body.zipCode?.trim(),
      country: body.country?.trim(),
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      idNumber: body.idNumber?.trim(),
      idType: body.idType,
      notes: body.notes?.trim()
    };

    // Create customer
    const customer = await createCustomer(customerData);

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating customer:', error);
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

    // Validate email format if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { success: false, message: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: CustomerUpdateInput = {};

    if (body.firstName !== undefined) {
      updateData.firstName = body.firstName.trim();
    }

    if (body.lastName !== undefined) {
      updateData.lastName = body.lastName.trim();
    }

    if (body.email !== undefined) {
      updateData.email = body.email.toLowerCase().trim();
    }

    if (body.phone !== undefined) {
      updateData.phone = body.phone.trim();
    }

    if (body.address !== undefined) {
      updateData.address = body.address?.trim();
    }

    if (body.city !== undefined) {
      updateData.city = body.city?.trim();
    }

    if (body.state !== undefined) {
      updateData.state = body.state?.trim();
    }

    if (body.zipCode !== undefined) {
      updateData.zipCode = body.zipCode?.trim();
    }

    if (body.country !== undefined) {
      updateData.country = body.country?.trim();
    }

    if (body.dateOfBirth !== undefined) {
      updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : undefined;
    }

    if (body.idNumber !== undefined) {
      updateData.idNumber = body.idNumber?.trim();
    }

    if (body.idType !== undefined) {
      updateData.idType = body.idType;
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes?.trim();
    }

    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

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

    // Soft delete customer
    const customer = await deleteCustomer(customerId);

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