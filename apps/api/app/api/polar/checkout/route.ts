import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuthRoles } from '@rentalshop/auth/server';
import type { UserScope } from '@rentalshop/auth/server';
import type { AuthUser } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { USER_ROLE, API } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { createPolarCheckout, polarExternalCustomerId, PolarApiError } from '../../../../lib/polar';
import { clientIp, loadPolarWebContext } from '../../../../lib/polar-web';

const httpUrl = z.string().url().max(2000).refine((u) => /^https?:\/\//i.test(u), 'http(s) URL');

const bodySchema = z.object({
  planId: z.number().int().positive(),
  interval: z.enum(['semi_annual', 'annual']),
  successUrl: httpUrl,
  returnUrl: httpUrl.optional(),
});

const STATUS_BY_DECISION: Record<string, number> = {
  SUBSCRIPTION_RENEWS_IN_STORE: API.STATUS.CONFLICT,
  POLAR_MANAGE_IN_PORTAL: API.STATUS.CONFLICT,
  PLAN_NOT_PURCHASABLE: API.STATUS.BAD_REQUEST,
};

/**
 * POST /api/polar/checkout (#1631) — a Polar checkout for one plan and cycle; answers `{ url }` (Polar's hosted page).
 * The shop is `merchant_<id>` in Polar; the webhook matches it back. Refused (same codes as `decision` in
 * GET /api/polar/offers): Polar off, the plan renews on a store / Lemon or on Polar (portal), or not purchasable now.
 * Works while the plan is expired (that is when a shop pays).
 */
export const POST = withAuthRoles([USER_ROLE.MERCHANT], { requireActiveSubscription: false })(
  async (request: NextRequest, ctx: { user: AuthUser; userScope: UserScope }) => {
    try {
      const merchantId = Number(ctx.userScope?.merchantId);
      if (!merchantId) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_ID_REQUIRED'), { status: API.STATUS.BAD_REQUEST });
      }
      const body = bodySchema.parse(await request.json());
      const context = await loadPolarWebContext(merchantId);
      if (!context.config.enabled) {
        return NextResponse.json(ResponseBuilder.error('POLAR_NOT_CONFIGURED'), { status: API.STATUS.BAD_REQUEST });
      }
      const offer = context.offers.find((o) => o.planId === body.planId && o.interval === body.interval);
      if (!offer) {
        return NextResponse.json(ResponseBuilder.error('PLAN_NOT_PURCHASABLE'), { status: API.STATUS.BAD_REQUEST });
      }
      if (offer.decision !== 'ok') {
        return NextResponse.json(ResponseBuilder.error(offer.decision), { status: STATUS_BY_DECISION[offer.decision] ?? 400 });
      }

      const merchant = await db.prisma.merchant.findUnique({ where: { id: merchantId }, select: { id: true, name: true, email: true } });
      if (!merchant) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: API.STATUS.NOT_FOUND });
      }
      const checkout = await createPolarCheckout(context.config, {
        products: [offer.productId],
        external_customer_id: polarExternalCustomerId(merchantId),
        customer_email: merchant.email || ctx.user.email || null,
        customer_name: merchant.name || null,
        customer_ip_address: clientIp(request.headers),
        currency: offer.currency.toLowerCase(),
        metadata: { merchantId: String(merchantId), planId: String(offer.planId), interval: offer.interval },
        success_url: body.successUrl,
        return_url: body.returnUrl ?? null,
      });
      if (!checkout?.url) {
        return NextResponse.json(ResponseBuilder.error('POLAR_REQUEST_FAILED'), { status: 502 });
      }
      return NextResponse.json(ResponseBuilder.success('POLAR_CHECKOUT_CREATED', { url: checkout.url }));
    } catch (error) {
      if (error instanceof PolarApiError) {
        console.error('[Polar] checkout:', error.status, JSON.stringify(error.body));
        return NextResponse.json(ResponseBuilder.error('POLAR_REQUEST_FAILED'), { status: 502 });
      }
      console.error('[Polar] checkout:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);
