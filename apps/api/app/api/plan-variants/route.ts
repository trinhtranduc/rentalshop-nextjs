import { NextRequest, NextResponse } from 'next/server';
import { 
  searchPlanVariants, 
  createPlanVariant, 
  getPlanVariantStats 
} from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import { planVariantCreateSchema } from '@rentalshop/utils';
import type { PlanVariantCreateInput } from '@rentalshop/types';
import {API} from '@rentalshop/constants';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    // Check if user is ADMIN (only admins can view all plan variants)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: API.STATUS.FORBIDDEN.STATUS.FORBIDDEN }
      );
    }

    // Get search parameters
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId');
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    const isPopular = searchParams.get('isPopular');
    const duration = searchParams.get('duration');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'sortOrder';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build filters
    const filters = {
      planId: planId || undefined,
      search: search || undefined,
      isActive: isActive ? isActive === 'true' : undefined,
      isPopular: isPopular ? isPopular === 'true' : undefined,
      duration: duration ? parseInt(duration) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      limit,
      offset,
      sortBy: sortBy as 'name' | 'price' | 'duration' | 'discount' | 'createdAt' | 'sortOrder',
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    // Use database function to search plan variants
    const result = await searchPlanVariants(filters);

    return NextResponse.json({
      success: true,
      data: {
        variants: result.variants,
        total: result.total,
        hasMore: result.hasMore
      }
    });

  } catch (error) {
    console.error('Error fetching plan variants:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, message: authResult.message },
        { status: authResult.status }
      );
    }

    const user = authResult.user;

    // Check if user is ADMIN (only admins can create plan variants)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = planVariantCreateSchema.parse(body);

    // Create plan variant using database function
    const variant = await createPlanVariant(validatedData);

    return NextResponse.json({
      success: true,
      data: variant,
      message: 'Plan variant created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating plan variant:', error);
    
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { success: false, message: 'Invalid input data', error: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}
