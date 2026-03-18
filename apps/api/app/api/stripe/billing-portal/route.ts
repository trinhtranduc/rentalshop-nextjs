import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { USER_ROLE, API } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { getStripe } from '../../../../lib/stripe';

interface BillingPortalBody {
  returnUrl: string;
}

export const POST = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT])(
  async (request: NextRequest, ctx: any) => {
    try {
      const { user, userScope } = ctx;
      const body = (await request.json()) as Partial<BillingPortalBody>;

      if (!body.returnUrl || typeof body.returnUrl !== 'string') {
        return NextResponse.json(ResponseBuilder.error('RETURN_URL_REQUIRED'), {
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

      let customerId: string | null = (merchant.stripeCustomerId as string | null) ?? null;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: merchant.email,
          name: merchant.name,
          metadata: { merchantId: String(merchant.id) },
        });
        customerId = customer.id;
        await db.prisma.merchant.update({
          where: { id: merchant.id },
          data: { stripeCustomerId: customerId } as any,
        });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: body.returnUrl,
      });

      return NextResponse.json(
        ResponseBuilder.success('STRIPE_BILLING_PORTAL_CREATED', {
          url: portalSession.url,
        })
      );
    } catch (error) {
      console.error('Error creating Stripe billing portal session:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);

