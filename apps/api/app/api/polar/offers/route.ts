import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import type { UserScope } from '@rentalshop/auth/server';
import type { AuthUser } from '@rentalshop/auth';
import { USER_ROLE, API } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { loadPolarWebContext } from '../../../../lib/polar-web';

/**
 * GET /api/polar/offers (#1631) — what the web plan page sells through Polar.
 * `{ enabled, offers: [{ planId, tier, interval, months, amount, currency, decision }], manage, channel, autoRenew }`.
 * `enabled` false = Polar is not configured (the page keeps its old Lemon flow). Prices come from the Polar products in
 * POLAR_PRODUCTS; `decision` is `ok` or the error code the checkout would answer. Works while the plan is expired.
 */
export const GET = withAuthRoles([USER_ROLE.MERCHANT], { requireActiveSubscription: false })(
  async (_request: NextRequest, ctx: { user: AuthUser; userScope: UserScope }) => {
    try {
      const merchantId = ctx.userScope?.merchantId;
      if (!merchantId) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_ID_REQUIRED'), { status: API.STATUS.BAD_REQUEST });
      }
      const context = await loadPolarWebContext(Number(merchantId));
      return NextResponse.json(
        ResponseBuilder.success('POLAR_OFFERS_FOUND', {
          enabled: context.config.enabled,
          offers: context.offers.map((o) => ({
            planId: o.planId,
            tier: o.tier,
            interval: o.interval,
            months: o.months,
            amount: o.amount,
            currency: o.currency,
            decision: o.decision,
          })),
          manage: context.manage,
          channel: context.channel,
          autoRenew: context.autoRenew,
        })
      );
    } catch (error) {
      console.error('[Polar] offers:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);
