import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles, validateMerchantAccess } from '@rentalshop/auth';
import { 
  planLimitAddonCreateSchema,
  planLimitAddonsQuerySchema,
  handleApiError,
  ResponseBuilder,
  sendPlanLimitAddonChangeEmail
} from '@rentalshop/utils';
import { API, USER_ROLE } from '@rentalshop/constants';

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
 * POST /api/merchants/[id]/plan-limit-addons
 * Create a new plan limit addon for a merchant
 * Authorization: ADMIN only
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolvedParams.id);
  
  return withAuthRoles(['ADMIN'])(async (request) => {
    try {
      // Validate merchant exists
      const merchant = await db.merchants.findById(merchantPublicId);
      if (!merchant) {
        return NextResponse.json(
          ResponseBuilder.error('MERCHANT_NOT_FOUND'),
          { status: 404 }
        );
      }

      const body = await request.json();
      
      // Validate input
      const parsed = planLimitAddonCreateSchema.safeParse({
        ...body,
        merchantId: merchantPublicId, // Force merchantId from URL
      });
      
      if (!parsed.success) {
        return NextResponse.json(
          ResponseBuilder.validationError(parsed.error.flatten()),
          { status: 400 }
        );
      }

      // Create plan limit addon
      const addon = await db.planLimitAddons.create(parsed.data);

      // Send email notification (non-blocking) - TEMPORARILY DISABLED
      // if (merchant.email) {
      //   console.log('📨 [Addon] Sending addon created email...', {
      //     to: merchant.email,
      //     merchantName: merchant.name,
      //     addonLimits: {
      //       outlets: addon.outlets,
      //       users: addon.users,
      //       products: addon.products,
      //       customers: addon.customers,
      //       orders: addon.orders
      //     },
      //     provider: process.env.EMAIL_PROVIDER || 'console'
      //   });
      //   
      //   sendPlanLimitAddonChangeEmail({
      //     merchantName: merchant.name || 'Quý khách',
      //     email: merchant.email,
      //     action: 'CREATED',
      //     addonLimits: {
      //       outlets: addon.outlets,
      //       users: addon.users,
      //       products: addon.products,
      //       customers: addon.customers,
      //       orders: addon.orders
      //     },
      //     notes: addon.notes || undefined
      //   })
      //     .then((emailResult) => {
      //       console.log('📬 [Addon] Addon created email result:', {
      //         success: emailResult.success,
      //         error: emailResult.error,
      //         messageId: emailResult.messageId,
      //         provider: process.env.EMAIL_PROVIDER
      //       });
      //     })
      //     .catch((error) => {
      //       console.error('❌ [Addon] Failed to send addon created email:', error);
      //     });
      // } else {
      //   console.warn('⚠️ [Addon] Cannot send addon created email: merchant email not found');
      // }

      return NextResponse.json(
        ResponseBuilder.success('PLAN_LIMIT_ADDON_CREATED_SUCCESS', addon),
        { status: 201 }
      );
    } catch (error) {
      console.error('Error creating plan limit addon:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

