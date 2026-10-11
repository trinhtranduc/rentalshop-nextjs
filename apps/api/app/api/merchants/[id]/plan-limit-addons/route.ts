import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles, validateMerchantAccess } from '@rentalshop/auth/server';
import { 
  planLimitAddonsQuerySchema,
  handleApiError,
  ResponseBuilder,
} from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/merchants/[id]/plan-limit-addons
 * Get plan limit addons for a specific merchant
 * Authorization: ADMIN, MERCHANT (own merchant only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  
  return withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT])(async (request, { user, userScope }) => {
    try {
      // Validate merchant access
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) {
        return validation.error!;
      }

      const { searchParams } = new URL(request.url);
      
      // Parse and validate query parameters
      const parsed = planLimitAddonsQuerySchema.safeParse({
        ...Object.fromEntries(searchParams.entries()),
        merchantId: merchantPublicId, // Force merchantId from URL
      });
      
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      // Search plan limit addons for this merchant
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
      console.error('Error fetching merchant plan limit addons:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * POST: add-ons are managed as modules since #782 (see /api/billing-modules and /api/merchants/[id]/modules).
 * The old rows stay readable; writing answers 410.
 */
export async function POST(_request: NextRequest, _context?: unknown) {
  return NextResponse.json(ResponseBuilder.error('ADDONS_REPLACED_BY_MODULES'), { status: 410 });
}

