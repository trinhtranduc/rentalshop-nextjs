import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import {  
  planLimitAddonsQuerySchema,
  handleApiError,
  ResponseBuilder,
} from '@rentalshop/utils';

/**
 * GET /api/plan-limit-addons
 * Get plan limit addons with filtering and pagination
 * Authorization: ADMIN only
 */
export const GET = withAuthRoles(['ADMIN'])(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse and validate query parameters
    const parsed = planLimitAddonsQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );
    
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    // Search plan limit addons
    const result = await db.planLimitAddons.search(parsed.data);

    return NextResponse.json(
      ResponseBuilder.success('PLAN_LIMIT_ADDONS_FOUND', {
        addons: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
      })
    );
  } catch (error) {
    console.error('Error fetching plan limit addons:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * POST /api/plan-limit-addons
 * Add-ons are managed as modules since #782 (see /api/billing-modules and /api/merchants/[id]/modules).
 * The old rows stay readable; writing answers 410.
 */
export const POST = withAuthRoles(['ADMIN'])(async (_request: NextRequest) => {
  return NextResponse.json(ResponseBuilder.error('ADDONS_REPLACED_BY_MODULES'), { status: 410 });
});

