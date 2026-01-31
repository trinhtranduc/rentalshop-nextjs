import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { planCreateSchema, handleApiError } from '@rentalshop/utils';
import type { PlanCreateInput } from '@rentalshop/types';
import {API} from '@rentalshop/constants';
import { withApiLogging } from '@/lib/api-logging-wrapper';

export const GET = withApiLogging(
  withAuthRoles(['ADMIN'])(async (request: NextRequest) => {
  try {
    // Get search parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    const isPopular = searchParams.get('isPopular');
    const includeInactive = searchParams.get('includeInactive');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const sortBy = searchParams.get('sortBy') || 'sortOrder';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build filters - default to active plans only unless explicitly requested
    const filters = {
      search: search || undefined,
      isActive: includeInactive === 'true' ? undefined : (isActive ? isActive === 'true' : true), // Show all if includeInactive=true
      isPopular: isPopular ? isPopular === 'true' : undefined,
      limit,
      page,
      sortBy: sortBy as 'name' | 'price' | 'basePrice' | 'createdAt' | 'sortOrder',  // ✅ Updated to support basePrice
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    // Use database function to search plans
    const result = await db.plans.search(filters);

    return NextResponse.json({
      success: true,
      data: {
        plans: result.plans || result.data,
        total: result.total,
        page: result.page || page,
        limit: result.limit || limit,
        totalPages: result.totalPages || Math.ceil(result.total / (result.limit || limit)),
        hasMore: result.hasMore
      }
    });

    } catch (error) {
      // Error will be automatically logged by withApiLogging wrapper
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);

export const POST = withApiLogging(
  withAuthRoles(['ADMIN'])(async (request: NextRequest) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = planCreateSchema.parse(body);

    // Create plan using database function
    const plan = await db.plans.create(validatedData);

    return NextResponse.json({
      success: true,
      data: plan,
      code: 'PLAN_CREATED_SUCCESS',
        message: 'Plan created successfully'
    }, { status: 201 });

    } catch (error: any) {
      // Error will be automatically logged by withApiLogging wrapper
      // Use unified error handling system
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })
);
