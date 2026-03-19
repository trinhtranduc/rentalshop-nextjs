import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { API, USER_ROLE } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder, normalizeBillingInterval } from '@rentalshop/utils';

type Interval = 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

function isInterval(value: string): value is Interval {
  return value === 'monthly' || value === 'quarterly' || value === 'semi_annual' || value === 'annual';
}

type PrismaLemonVariantClient = {
  planLemonSqueezyVariant: {
    findMany: (args: unknown) => Promise<unknown>;
    upsert: (args: unknown) => Promise<unknown>;
  };
  $transaction: <T>(fn: (tx: PrismaLemonVariantClient) => Promise<T>) => Promise<T>;
};

/**
 * GET /api/plans/[id]/lemon-squeezy-variants
 * ADMIN-only. Returns Lemon Squeezy variant mappings for a plan.
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

      const prismaAny = db.prisma as unknown as PrismaLemonVariantClient;

      const items = await prismaAny.planLemonSqueezyVariant.findMany({
        where: { planId, isActive: true },
        select: {
          billingInterval: true,
          lemonVariantId: true,
          lemonStoreId: true,
          currency: true,
          isActive: true,
          updatedAt: true,
        },
        orderBy: { billingInterval: 'asc' },
      });

      return NextResponse.json(
        ResponseBuilder.success('PLAN_LEMON_SQUEEZY_VARIANTS_FOUND', {
          planId,
          items,
        })
      );
    } catch (error) {
      console.error('Error fetching plan Lemon Squeezy variants:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PUT /api/plans/[id]/lemon-squeezy-variants
 * ADMIN-only. Upsert Lemon Squeezy variant mappings for a plan.
 *
 * Body:
 * {
 *   currency?: string,
 *   storeId?: string,
 *   variants: { monthly?: string, quarterly?: string, semi_annual?: string, annual?: string }
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

      const prismaAny = db.prisma as unknown as PrismaLemonVariantClient;

      const body = (await request.json()) as {
        currency?: string;
        storeId?: string;
        variants?: Record<string, string | undefined>;
      };

      if (!body.variants || typeof body.variants !== 'object') {
        return NextResponse.json(ResponseBuilder.error('VARIANTS_REQUIRED'), { status: API.STATUS.BAD_REQUEST });
      }

      const entries = Object.entries(body.variants)
        .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
        .map(([k, v]) => [normalizeBillingInterval(k), String(v).trim()] as const)
        .filter(([k]) => isInterval(k));

      if (entries.length === 0) {
        return NextResponse.json(ResponseBuilder.error('NO_VALID_VARIANTS_PROVIDED'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      await prismaAny.$transaction(async (tx) => {
        for (const [billingInterval, lemonVariantId] of entries) {
          await tx.planLemonSqueezyVariant.upsert({
            where: { planId_billingInterval: { planId, billingInterval } },
            create: {
              planId,
              billingInterval,
              lemonVariantId,
              lemonStoreId: body.storeId,
              currency: body.currency,
              isActive: true,
            },
            update: {
              lemonVariantId,
              lemonStoreId: body.storeId,
              currency: body.currency,
              isActive: true,
              updatedAt: new Date(),
            },
          });
        }
      });

      const items = await prismaAny.planLemonSqueezyVariant.findMany({
        where: { planId, isActive: true },
        select: {
          billingInterval: true,
          lemonVariantId: true,
          lemonStoreId: true,
          currency: true,
          isActive: true,
          updatedAt: true,
        },
        orderBy: { billingInterval: 'asc' },
      });

      return NextResponse.json(
        ResponseBuilder.success('PLAN_LEMON_SQUEEZY_VARIANTS_UPDATED', {
          planId,
          items,
        })
      );
    } catch (error) {
      console.error('Error updating plan Lemon Squeezy variants:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

