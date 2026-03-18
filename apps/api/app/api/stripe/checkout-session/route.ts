import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { USER_ROLE, API } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { getStripe } from '../../../../lib/stripe';

interface CheckoutSessionBody {
  planId: number;
  successUrl: string;
  cancelUrl: string;
}

export const POST = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT])(
  async (request: NextRequest, ctx: any) => {
    try {
      const { user, userScope } = ctx;
      const body = (await request.json()) as Partial<CheckoutSessionBody>;

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
      if (!body.cancelUrl || typeof body.cancelUrl !== 'string') {
        return NextResponse.json(ResponseBuilder.error('CANCEL_URL_REQUIRED'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      const merchantId =
        user.role === USER_ROLE.ADMIN
          ? (body as any).merchantId ?? null
          : (userScope as any)?.merchantId ?? null;

      if (!merchantId || !Number.isFinite(merchantId)) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_ID_REQUIRED'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      const stripe = getStripe();

      const merchant = (await db.prisma.merchant.findUnique({
        where: { id: Number(merchantId) },
        select: { id: true, name: true, email: true, stripeCustomerId: true } as any,
      })) as any;

      if (!merchant) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), {
          status: API.STATUS.NOT_FOUND,
        });
      }

      const plan = (await db.prisma.plan.findUnique({
        where: { id: Number(body.planId) },
        select: { id: true, name: true, trialDays: true, stripePriceId: true, currency: true } as any,
      })) as any;

      if (!plan) {
        return NextResponse.json(ResponseBuilder.error('PLAN_NOT_FOUND'), {
          status: API.STATUS.NOT_FOUND,
        });
      }

      if (!plan.stripePriceId) {
        return NextResponse.json(ResponseBuilder.error('PLAN_STRIPE_PRICE_ID_NOT_SET'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      let customerId: string | null = (merchant.stripeCustomerId as string | null) ?? null;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: merchant.email,
          name: merchant.name,
          metadata: {
            merchantId: String(merchant.id),
          },
        });

        customerId = customer.id;

        // Prisma client may not be regenerated yet for stripeCustomerId field
        await db.prisma.merchant.update({
          where: { id: merchant.id },
          data: { stripeCustomerId: customerId } as any,
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: plan.stripePriceId, quantity: 1 }],
        success_url: body.successUrl,
        cancel_url: body.cancelUrl,
        allow_promotion_codes: true,
        client_reference_id: String(merchant.id),
        metadata: {
          merchantId: String(merchant.id),
          planId: String(plan.id),
        },
        subscription_data: plan.trialDays
          ? {
              trial_period_days: Number(plan.trialDays),
              metadata: {
                merchantId: String(merchant.id),
                planId: String(plan.id),
              },
            }
          : {
              metadata: {
                merchantId: String(merchant.id),
                planId: String(plan.id),
              },
            },
      });

      return NextResponse.json(
        ResponseBuilder.success('STRIPE_CHECKOUT_SESSION_CREATED', {
          id: session.id,
          url: session.url,
        })
      );
    } catch (error) {
      console.error('Error creating Stripe checkout session:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);

