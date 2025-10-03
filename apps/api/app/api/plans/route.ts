import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { planCreateSchema } from '@rentalshop/utils';
import type { PlanCreateInput } from '@rentalshop/types';
import {API} from '@rentalshop/constants';

export const GET = withAuthRoles(['ADMIN'])(async (request: NextRequest) => {
  try {
    // Get search parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    const isPopular = searchParams.get('isPopular');
    const includeInactive = searchParams.get('includeInactive');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'sortOrder';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build filters - default to active plans only unless explicitly requested
    const filters = {
      search: search || undefined,
      isActive: includeInactive === 'true' ? undefined : (isActive ? isActive === 'true' : true), // Show all if includeInactive=true
      isPopular: isPopular ? isPopular === 'true' : undefined,
      limit,
      offset,
      sortBy: sortBy as 'name' | 'price' | 'basePrice' | 'createdAt' | 'sortOrder',  // ✅ Updated to support basePrice
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    // Use database function to search plans
    const result = await db.plans.search(filters);

    return NextResponse.json({
      success: true,
      data: {
        plans: result.data,
        total: result.total,
        hasMore: result.hasMore
      }
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: API.STATUS.INTERNAL_SERVER_ERROR }
    );
  }
});

export const POST = withAuthRoles(['ADMIN'])(async (request: NextRequest) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = planCreateSchema.parse(body);

    // Create plan using database function
    const plan = await db.plans.create(validatedData);

    return NextResponse.json({
      success: true,
      data: plan,
      message: 'Plan created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating plan:', error);
    
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
});
