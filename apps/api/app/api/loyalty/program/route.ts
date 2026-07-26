import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth/server';
import { prisma, provisionDefaultLoyaltyProgram } from '@rentalshop/database';
import {
  upsertLoyaltyProgram,
} from '@rentalshop/loyalty';
import { handleApiError, loyaltyProgramSchema, ResponseBuilder, ApiError, ErrorCode } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';
import {
  loyaltyErrorResponse,
  resolveLoyaltyMerchantId,
  withLoyaltyPlanGate,
} from '@/lib/loyalty-route-helpers';

export const GET = withPermissions(['loyalty.view'])(async (_request, { user, userScope }) => {
  try {
    const merchantId = await resolveLoyaltyMerchantId(user, userScope);
    await withLoyaltyPlanGate(merchantId);

    let program = await prisma.loyaltyProgram.findUnique({
      where: { merchantId },
    });

    // Auto-heal merchants registered before provision-on-signup
    if (!program) {
      await provisionDefaultLoyaltyProgram(prisma, merchantId);
      program = await prisma.loyaltyProgram.findUnique({
        where: { merchantId },
      });
    }

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

    const payload = { ...parsed.data };

    // Only Super Admin may change isActive. Merchants configure rates/tiers only.
    if (user.role !== USER_ROLE.ADMIN) {
      if (Object.prototype.hasOwnProperty.call(body, 'isActive')) {
        const existing = await prisma.loyaltyProgram.findUnique({
          where: { merchantId },
          select: { isActive: true },
        });
        if (existing && body.isActive !== existing.isActive) {
          throw new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS);
        }
      }
      delete payload.isActive;
    }

    const program = await upsertLoyaltyProgram(merchantId, payload as typeof parsed.data & { name: string });
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
