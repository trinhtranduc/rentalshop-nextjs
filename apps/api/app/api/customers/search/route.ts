import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenSimple } from '@rentalshop/auth';
import { searchCustomers } from '@rentalshop/database';
import type { CustomerSearchFilter } from '@rentalshop/database';

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
    const q = searchParams.get('q');
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

    if (q) {
      filters.q = q;
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

  } catch (error) {
    console.error('Error searching customers:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
} 