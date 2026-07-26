import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma } from '@rentalshop/database';
import {
  upsertLoyaltyProgram,
} from '@rentalshop/loyalty';
import { handleApiError, loyaltyProgramSchema, ResponseBuilder } from '@rentalshop/utils';
import {
  loyaltyErrorResponse,
  resolveLoyaltyMerchantId,
  withLoyaltyPlanGate,
} from '@/lib/loyalty-route-helpers';

export const GET = withPermissions(['loyalty.view'])(async (_request, { user, userScope }) => {
  try {
    const merchantId = await resolveLoyaltyMerchantId(user, userScope);
    await withLoyaltyPlanGate(merchantId);

    const program = await prisma.loyaltyProgram.findUnique({
      where: { merchantId },
    });

    return NextResponse.json(ResponseBuilder.success('LOYALTY_PROGRAM_FOUND', program));
  } catch (error) {
    const gateResponse = loyaltyErrorResponse(error);
    if (gateResponse.status !== 400 || (error instanceof Error && error.message !== 'LOYALTY_ERROR')) {
      if (error instanceof Error && ['PLAN_UPGRADE_REQUIRED', 'MERCHANT_ASSOCIATION_REQUIRED', 'MERCHANT_ID_REQUIRED', 'CUSTOMER_NOT_FOUND'].includes(error.message)) {
        return gateResponse;
      }
    }
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const PUT = withPermissions(['loyalty.manage'])(async (request: NextRequest, { user, userScope }) => {
  try {
    const merchantId = await resolveLoyaltyMerchantId(user, userScope);
    await withLoyaltyPlanGate(merchantId);

    const body = await request.json();
    const parsed = loyaltyProgramSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), {
        status: 400,
      });
    }

    const program = await upsertLoyaltyProgram(merchantId, parsed.data);
    return NextResponse.json(ResponseBuilder.success('PROGRAM_UPDATED', program));
  } catch (error) {
    const gateResponse = loyaltyErrorResponse(error);
    if (error instanceof Error && ['PLAN_UPGRADE_REQUIRED', 'MERCHANT_ASSOCIATION_REQUIRED', 'MERCHANT_ID_REQUIRED'].includes(error.message)) {
      return gateResponse;
    }
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
