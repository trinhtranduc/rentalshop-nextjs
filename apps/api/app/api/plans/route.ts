import { NextRequest, NextResponse } from 'next/server';
import { searchPlans, createPlan, getPlanStats } from '@rentalshop/database';
import { authenticateRequest } from '@rentalshop/auth';
import { planCreateSchema } from '@rentalshop/utils';
import type { PlanCreateInput } from '@rentalshop/types';
import {API} from '@rentalshop/constants';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
return authResult.response;
      );
    }

    const user = authResult.user;

    // Check if user is ADMIN (only admins can view all plans)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

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
    const result = await searchPlans(filters);

    return NextResponse.json({
      success: true,
      data: {
        plans: result.plans,
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
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication using the centralized method
    const authResult = await authenticateRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
return authResult.response;
      );
    }

    const user = authResult.user;

    // Check if user is ADMIN (only admins can create plans)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Insufficient permissions' },
        { status: API.STATUS.FORBIDDEN }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = planCreateSchema.parse(body);

    // Create plan using database function
    const plan = await createPlan(validatedData);

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
}
