import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import { ensureDefaultTier } from '@rentalshop/loyalty';
import {
  handleApiError,
  loyaltyTierUpdateSchema,
  ResponseBuilder,
} from '@rentalshop/utils';
import {
  loyaltyErrorResponse,
  resolveLoyaltyMerchantId,
  withLoyaltyPlanGate,
} from '@/lib/loyalty-route-helpers';

async function getTierForMerchant(tierId: number, merchantId: number) {
  return prisma.loyaltyTier.findFirst({
    where: {
      id: tierId,
      program: { merchantId },
    },
    include: { program: true },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);

  return withPermissions(['loyalty.manage'])(async (_request, { user, userScope }) => {
    try {
      const merchantId = await resolveLoyaltyMerchantId(user, userScope);
      await withLoyaltyPlanGate(merchantId);

      const tierId = parseInt(id, 10);
      if (Number.isNaN(tierId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_TIER_ID'), { status: 400 });
      }

      const existingTier = await getTierForMerchant(tierId, merchantId);
      if (!existingTier) {
        return NextResponse.json(ResponseBuilder.error('LOYALTY_TIER_NOT_FOUND'), { status: 404 });
      }

      const body = await request.json();
      const parsed = loyaltyTierUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }

      const tier = await prisma.loyaltyTier.update({
        where: { id: tierId },
        data: parsed.data,
      });

      await ensureDefaultTier(existingTier.programId);

      return NextResponse.json(ResponseBuilder.success('LOYALTY_TIER_UPDATED', tier));
    } catch (error) {
      const gateResponse = loyaltyErrorResponse(error);
      if (error instanceof Error && ['PLAN_UPGRADE_REQUIRED', 'MERCHANT_ASSOCIATION_REQUIRED', 'MERCHANT_ID_REQUIRED'].includes(error.message)) {
        return gateResponse;
      }
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);

  return withPermissions(['loyalty.manage'])(async (_request, { user, userScope }) => {
    try {
      const merchantId = await resolveLoyaltyMerchantId(user, userScope);
      await withLoyaltyPlanGate(merchantId);

      const tierId = parseInt(id, 10);
      if (Number.isNaN(tierId)) {
        return NextResponse.json(ResponseBuilder.error('INVALID_TIER_ID'), { status: 400 });
      }

      const existingTier = await getTierForMerchant(tierId, merchantId);
      if (!existingTier) {
        return NextResponse.json(ResponseBuilder.error('LOYALTY_TIER_NOT_FOUND'), { status: 404 });
      }

      const tierCount = await prisma.loyaltyTier.count({
        where: { programId: existingTier.programId },
      });

      if (tierCount <= 1) {
        return NextResponse.json(ResponseBuilder.error('CANNOT_DELETE_LAST_TIER'), { status: 400 });
      }

      const lowerTiers = await prisma.loyaltyTier.findMany({
        where: {
          programId: existingTier.programId,
          threshold: { lt: existingTier.threshold },
        },
        orderBy: { threshold: 'desc' },
      });

      const fallbackTier =
        lowerTiers[0] ||
        (await prisma.loyaltyTier.findFirst({
          where: {
            programId: existingTier.programId,
            id: { not: tierId },
          },
          orderBy: { threshold: 'asc' },
        }));

      if (!fallbackTier) {
        return NextResponse.json(ResponseBuilder.error('CANNOT_DELETE_LAST_TIER'), { status: 400 });
      }

      const reassigned = await prisma.customerLoyalty.updateMany({
        where: { currentTierId: tierId },
        data: { currentTierId: fallbackTier.id },
      });

      await prisma.loyaltyTier.delete({ where: { id: tierId } });

      return NextResponse.json(
        ResponseBuilder.success('LOYALTY_TIER_DELETED', {
          deletedTierId: tierId,
          customersReassigned: reassigned.count,
          newTierId: fallbackTier.id,
        })
      );
    } catch (error) {
      const gateResponse = loyaltyErrorResponse(error);
      if (error instanceof Error && ['PLAN_UPGRADE_REQUIRED', 'MERCHANT_ASSOCIATION_REQUIRED', 'MERCHANT_ID_REQUIRED'].includes(error.message)) {
        return gateResponse;
      }
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
