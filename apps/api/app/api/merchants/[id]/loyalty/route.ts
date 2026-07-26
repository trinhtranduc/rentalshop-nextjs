import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { prisma, provisionDefaultLoyaltyProgram } from '@rentalshop/database';
import { USER_ROLE, API } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { z } from 'zod';

const loyaltyStatusSchema = z.object({
  isActive: z.boolean(),
});

/**
 * GET /api/merchants/[id]/loyalty
 * Super Admin: read loyalty program status for a merchant
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const merchantId = parseInt(resolvedParams.id, 10);

  return withAuthRoles([USER_ROLE.ADMIN])(async () => {
    try {
      if (Number.isNaN(merchantId) || merchantId <= 0) {
        return NextResponse.json(ResponseBuilder.error('INVALID_MERCHANT_ID'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { id: true, name: true },
      });
      if (!merchant) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), {
          status: API.STATUS.NOT_FOUND,
        });
      }

      let program = await prisma.loyaltyProgram.findUnique({
        where: { merchantId },
      });
      if (!program) {
        await provisionDefaultLoyaltyProgram(prisma, merchantId);
        program = await prisma.loyaltyProgram.findUnique({
          where: { merchantId },
        });
      }

      return NextResponse.json(
        ResponseBuilder.success('LOYALTY_PROGRAM_FOUND', {
          merchant,
          program,
        })
      );
    } catch (error) {
      console.error('Error fetching merchant loyalty:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}

/**
 * PATCH /api/merchants/[id]/loyalty
 * Super Admin only: enable/disable loyalty for a merchant
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const merchantId = parseInt(resolvedParams.id, 10);

  return withAuthRoles([USER_ROLE.ADMIN])(async () => {
    try {
      if (Number.isNaN(merchantId) || merchantId <= 0) {
        return NextResponse.json(ResponseBuilder.error('INVALID_MERCHANT_ID'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { id: true, name: true },
      });
      if (!merchant) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), {
          status: API.STATUS.NOT_FOUND,
        });
      }

      const body = await request.json();
      const parsed = loyaltyStatusSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      await provisionDefaultLoyaltyProgram(prisma, merchantId);

      const program = await prisma.loyaltyProgram.update({
        where: { merchantId },
        data: {
          isActive: parsed.data.isActive,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json(
        ResponseBuilder.success(
          parsed.data.isActive ? 'LOYALTY_ENABLED' : 'LOYALTY_DISABLED',
          { merchant, program }
        )
      );
    } catch (error) {
      console.error('Error updating merchant loyalty status:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
