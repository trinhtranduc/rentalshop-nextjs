import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import { ensureDefaultTier } from '@rentalshop/loyalty';
import {
  handleApiError,
  loyaltyTierCreateSchema,
  ResponseBuilder,
} from '@rentalshop/utils';
import {
  loyaltyErrorResponse,
  resolveLoyaltyMerchantId,
  withLoyaltyPlanGate,
} from '@/lib/loyalty-route-helpers';

export const GET = withPermissions(['loyalty.view'])(async (_request, { user, userScope }) => {
  try {
    const merchantId = await resolveLoyaltyMerchantId(user, userScope);
    await withLoyaltyPlanGate(merchantId);

    const program = await prisma.loyaltyProgram.findUnique({ where: { merchantId } });
    if (!program) {
      return NextResponse.json(ResponseBuilder.success('LOYALTY_TIERS_FOUND', []));
    }

    const tiers = await prisma.loyaltyTier.findMany({
      where: { programId: program.id },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(ResponseBuilder.success('LOYALTY_TIERS_FOUND', tiers));
  } catch (error) {
    const gateResponse = loyaltyErrorResponse(error);
    if (error instanceof Error && ['PLAN_UPGRADE_REQUIRED', 'MERCHANT_ASSOCIATION_REQUIRED', 'MERCHANT_ID_REQUIRED'].includes(error.message)) {
      return gateResponse;
    }
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const POST = withPermissions(['loyalty.manage'])(async (request: NextRequest, { user, userScope }) => {
  try {
    const merchantId = await resolveLoyaltyMerchantId(user, userScope);
    await withLoyaltyPlanGate(merchantId);

    const body = await request.json();
    const parsed = loyaltyTierCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
    }

    let program = await prisma.loyaltyProgram.findUnique({ where: { merchantId } });
    if (!program) {
      return NextResponse.json(ResponseBuilder.error('LOYALTY_PROGRAM_NOT_FOUND'), { status: 404 });
    }

    const tier = await prisma.loyaltyTier.create({
      data: {
        programId: program.id,
        ...parsed.data,
        benefits: parsed.data.benefits || '[]',
        sortOrder: parsed.data.sortOrder ?? 0,
      },
    });

    await ensureDefaultTier(program.id);

    return NextResponse.json(ResponseBuilder.success('LOYALTY_TIER_CREATED', tier), { status: 201 });
  } catch (error) {
    const gateResponse = loyaltyErrorResponse(error);
    if (error instanceof Error && ['PLAN_UPGRADE_REQUIRED', 'MERCHANT_ASSOCIATION_REQUIRED', 'MERCHANT_ID_REQUIRED'].includes(error.message)) {
      return gateResponse;
    }
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
