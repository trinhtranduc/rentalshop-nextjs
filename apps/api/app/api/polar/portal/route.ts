import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuthRoles } from '@rentalshop/auth/server';
import type { UserScope } from '@rentalshop/auth/server';
import type { AuthUser } from '@rentalshop/auth';
import { USER_ROLE, API } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { createPolarCustomerSession, polarConfig, polarExternalCustomerId, PolarApiError } from '../../../../lib/polar';

const bodySchema = z.object({
  returnUrl: z.string().url().max(2000).refine((u) => /^https?:\/\//i.test(u), 'http(s) URL').optional(),
});

/**
 * POST /api/polar/portal (#1631) — Polar's customer portal for this shop (cancel, uncancel, card, invoices, plan
 * switch); answers `{ url }`. POLAR_CUSTOMER_NOT_FOUND when the shop never paid through Polar.
 */
export const POST = withAuthRoles([USER_ROLE.MERCHANT], { requireActiveSubscription: false })(
  async (request: NextRequest, ctx: { user: AuthUser; userScope: UserScope }) => {
    try {
      const merchantId = Number(ctx.userScope?.merchantId);
      if (!merchantId) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_ID_REQUIRED'), { status: API.STATUS.BAD_REQUEST });
      }
      const raw = await request.text();
      const body = bodySchema.parse(raw ? JSON.parse(raw) : {});
      const config = polarConfig();
      if (!config.accessToken) {
        return NextResponse.json(ResponseBuilder.error('POLAR_NOT_CONFIGURED'), { status: API.STATUS.BAD_REQUEST });
      }
      const session = await createPolarCustomerSession(config, {
        external_customer_id: polarExternalCustomerId(merchantId),
        return_url: body.returnUrl ?? null,
      });
      return NextResponse.json(ResponseBuilder.success('POLAR_PORTAL_CREATED', { url: session.customer_portal_url }));
    } catch (error) {
      if (error instanceof PolarApiError) {
        console.error('[Polar] portal:', error.status, JSON.stringify(error.body));
        const missing = error.status === 404 || error.status === 422;
        return NextResponse.json(ResponseBuilder.error(missing ? 'POLAR_CUSTOMER_NOT_FOUND' : 'POLAR_REQUEST_FAILED'), {
          status: missing ? API.STATUS.NOT_FOUND : 502,
        });
      }
      console.error('[Polar] portal:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);
