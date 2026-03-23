import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import { planCreateSchema, handleApiError } from '@rentalshop/utils';
import type { PlanCreateInput } from '@rentalshop/types';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * GET: ADMIN (full catalog + inactive) | MERCHANT (active plans only, for upgrade/checkout).
 * requireActiveSubscription: false so expired merchants can still load plans to renew.
 */
export const GET = withAuthRoles(['ADMIN', 'MERCHANT'], { requireActiveSubscription: false })(
  async (request: NextRequest, { user }) => {
  try {
    // Get search parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const isActiveParam = searchParams.get('isActive');
    const isPopular = searchParams.get('isPopular');
    const includeInactiveParam = searchParams.get('includeInactive');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const sortBy = searchParams.get('sortBy') || 'sortOrder';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    const isMerchant = user?.role === USER_ROLE.MERCHANT;

    // Merchants: never expose inactive / draft plans via query manipulation
    const includeInactive = isMerchant ? false : includeInactiveParam === 'true';
    const isActive = includeInactive
      ? undefined
      : isMerchant
        ? true
        : isActiveParam
          ? isActiveParam === 'true'
          : true;

    // Build filters - default to active plans only unless explicitly requested (admin only)
    const filters = {
      search: search || undefined,
      isActive,
      isPopular: isPopular ? isPopular === 'true' : undefined,
      limit,
      page,
      sortBy: sortBy as 'name' | 'price' | 'basePrice' | 'createdAt' | 'sortOrder',  // ✅ Updated to support basePrice
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    // Use database function to search plans
    const result = await db.plans.search(filters);
    const resultLimit = result.limit ?? limit;
    const resultPage = result.page ?? page;

    return NextResponse.json({
      success: true,
      data: {
        plans: result.data,
        total: result.total,
        page: resultPage,
        limit: resultLimit,
        totalPages: Math.ceil(result.total / resultLimit) || 1,
        hasMore: result.hasMore
      }
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
  }
);

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
      code: 'PLAN_CREATED_SUCCESS',
        message: 'Plan created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating plan:', error);
    
    // Use unified error handling system
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
