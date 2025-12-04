import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { 
  planLimitAddonCreateSchema, 
  planLimitAddonsQuerySchema,
  handleApiError,
  ResponseBuilder 
} from '@rentalshop/utils';
import { API } from '@rentalshop/constants';

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
 * Create a new plan limit addon
 * Authorization: ADMIN only
 */
export const POST = withAuthRoles(['ADMIN'])(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    // Validate input
    const parsed = planLimitAddonCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    // Verify merchant exists
    const merchant = await db.merchants.findById(parsed.data.merchantId);
    if (!merchant) {
      return NextResponse.json(
        ResponseBuilder.error('MERCHANT_NOT_FOUND'),
        { status: 404 }
      );
    }

    // Create plan limit addon
    const addon = await db.planLimitAddons.create(parsed.data);

    return NextResponse.json(
      ResponseBuilder.success('PLAN_LIMIT_ADDON_CREATED_SUCCESS', addon),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating plan limit addon:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

