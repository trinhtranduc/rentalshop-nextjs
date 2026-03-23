import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { API, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, normalizeBillingInterval } from '@rentalshop/utils';

type Interval = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

function isInterval(value: string): value is Interval {
  return value === 'monthly' || value === 'quarterly' || value === 'semi_annual' || value === 'annual';
}

type PrismaStripePriceClient = {
  planStripePrice: {
    findMany: (args: unknown) => Promise<unknown>;
    upsert: (args: unknown) => Promise<unknown>;
  };
  $transaction: <T>(fn: (tx: PrismaStripePriceClient) => Promise<T>) => Promise<T>;
};

/**
 * GET /api/plans/[id]/stripe-prices
 * ADMIN-only. Returns Stripe price mappings for a plan.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const planId = parseInt(resolvedParams.id);

  return withAuthRoles([USER_ROLE.ADMIN])(async () => {
    try {
      if (isNaN(planId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_PLAN_ID_FORMAT'), { status: API.STATUS.BAD_REQUEST });
      }

      const prismaAny = db.prisma as unknown as PrismaStripePriceClient;

      const items = await prismaAny.planStripePrice.findMany({
        where: { planId, isActive: true },
        select: { billingInterval: true, stripePriceId: true, currency: true, isActive: true, updatedAt: true },
        orderBy: { billingInterval: 'asc' },
      });

      return NextResponse.json(
        ResponseBuilder.success('PLAN_STRIPE_PRICES_FOUND', {
          planId,
          items,
        })
      );
    } catch (error) {
      console.error('Error fetching plan stripe prices:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/plans/[id]/stripe-prices
 * ADMIN-only. Upsert Stripe price mappings for a plan.
 *
 * Body:
 * {
 *   currency?: string,
 *   prices: { monthly?: string, quarterly?: string, semi_annual?: string, annual?: string }
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const planId = parseInt(resolvedParams.id);

  return withAuthRoles([USER_ROLE.ADMIN])(async () => {
    try {
      if (isNaN(planId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_PLAN_ID_FORMAT'), { status: API.STATUS.BAD_REQUEST });
      }

      const prismaAny = db.prisma as unknown as PrismaStripePriceClient;

      const body = (await request.json()) as {
        currency?: string;
        prices?: Record<string, string | undefined>;
      };

      if (!body.prices || typeof body.prices !== 'object') {
        return NextResponse.json(ResponseBuilder.error('PRICES_REQUIRED'), { status: API.STATUS.BAD_REQUEST });
      }

      const entries = Object.entries(body.prices)
        .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
        .map(([k, v]) => [normalizeBillingInterval(k), String(v).trim()] as const)
        .filter(([k]) => isInterval(k));

      if (entries.length === 0) {
        return NextResponse.json(ResponseBuilder.error('NO_VALID_PRICES_PROVIDED'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      // Save overwrites by (planId, billingInterval); same stripePriceId may appear in multiple slots.
      // Atomic save: either all intervals are updated, or none.
      await prismaAny.$transaction(async (tx) => {
        for (const [billingInterval, stripePriceId] of entries) {
          await tx.planStripePrice.upsert({
            where: { planId_billingInterval: { planId, billingInterval } },
            create: {
              planId,
              billingInterval,
              stripePriceId,
              currency: body.currency,
              isActive: true,
            },
            update: {
              stripePriceId,
              currency: body.currency,
              isActive: true,
              updatedAt: new Date(),
            },
          });
        }
      });

      const items = await prismaAny.planStripePrice.findMany({
        where: { planId, isActive: true },
        select: { billingInterval: true, stripePriceId: true, currency: true, isActive: true, updatedAt: true },
        orderBy: { billingInterval: 'asc' },
      });

      return NextResponse.json(
        ResponseBuilder.success('PLAN_STRIPE_PRICES_UPDATED', {
          planId,
          items,
        })
      );
    } catch (error) {
      console.error('Error updating plan stripe prices:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

