import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import type { UserScope } from '@rentalshop/auth/server';
import type { AuthUser } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { USER_ROLE, API } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, normalizeBillingInterval } from '@rentalshop/utils';
import { env } from '@rentalshop/env';
import { lemonSqueezyFetch } from '../../../../lib/lemonsqueezy';

interface SubscriptionCheckoutBody {
  planId: number;
  billingInterval?: string;
  successUrl: string;
  cancelUrl?: string;
  merchantId?: number; // ADMIN-only override
}

/** Allow checkout when subscription expired — recovery path; role + scope still enforced in handler. */
export const POST = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT], {
  requireActiveSubscription: false,
})(
  async (request: NextRequest, ctx: { user: AuthUser; userScope: UserScope }) => {
    try {
      const { user, userScope } = ctx;
      const body = (await request.json()) as Partial<SubscriptionCheckoutBody>;

      if (!body.planId || !Number.isFinite(body.planId)) {
        return NextResponse.json(ResponseBuilder.error('PLAN_ID_REQUIRED'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }
      if (!body.successUrl || typeof body.successUrl !== 'string') {
        return NextResponse.json(ResponseBuilder.error('SUCCESS_URL_REQUIRED'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      const merchantId =
        user.role === USER_ROLE.ADMIN ? body.merchantId ?? null : userScope?.merchantId ?? null;

      if (!merchantId || !Number.isFinite(merchantId)) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_ID_REQUIRED'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      if (!env.LEMON_SQUEEZY_STORE_ID || !env.LEMON_SQUEEZY_API_KEY) {
        return NextResponse.json(ResponseBuilder.error('LEMON_SQUEEZY_NOT_CONFIGURED'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      const requestedInterval = normalizeBillingInterval(body.billingInterval || 'monthly');

      const plan = await db.prisma.plan.findUnique({
        where: { id: Number(body.planId) },
        select: { id: true, name: true, currency: true, trialDays: true },
      });
      if (!plan) {
        return NextResponse.json(ResponseBuilder.error('PLAN_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const merchant = await db.prisma.merchant.findUnique({
        where: { id: Number(merchantId) },
        select: { id: true, name: true, email: true },
      });
      if (!merchant) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }

      const mapping = await db.prisma.planLemonSqueezyVariant.findFirst({
        where: {
          planId: plan.id,
          billingInterval: requestedInterval as any,
          isActive: true,
        },
        select: { lemonVariantId: true, lemonStoreId: true, currency: true },
      });

      if (!mapping?.lemonVariantId) {
        return NextResponse.json(ResponseBuilder.error('PLAN_LEMON_SQUEEZY_VARIANT_NOT_SET'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      const storeId = mapping.lemonStoreId || env.LEMON_SQUEEZY_STORE_ID;

      const checkout = await lemonSqueezyFetch('/v1/checkouts', {
        method: 'POST',
        body: {
          data: {
            type: 'checkouts',
            attributes: {
              product_options: {
                redirect_url: body.successUrl,
              },
              checkout_data: {
                email: merchant.email,
                name: merchant.name,
                custom: {
                  merchantId: String(merchant.id),
                  planId: String(plan.id),
                  billingInterval: requestedInterval,
                },
              },
            },
            relationships: {
              store: { data: { type: 'stores', id: String(storeId) } },
              variant: { data: { type: 'variants', id: String(mapping.lemonVariantId) } },
            },
          },
        },
      });

      const checkoutUrl: string | undefined = checkout?.data?.attributes?.url;
      if (!checkoutUrl) {
        return NextResponse.json(ResponseBuilder.error('LEMON_SQUEEZY_CHECKOUT_URL_MISSING'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      return NextResponse.json(
        ResponseBuilder.success('LEMON_SQUEEZY_CHECKOUT_CREATED', {
          url: checkoutUrl,
        })
      );
    } catch (error) {
      console.error('Error creating Lemon Squeezy subscription checkout:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);

