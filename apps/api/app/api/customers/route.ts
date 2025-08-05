import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { getCustomers, createCustomer } from '@rentalshop/database';
import type { CustomerFilters, CustomerInput } from '@rentalshop/database';

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

    // Get query parameters
    const { searchParams } = new URL(request.url);
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