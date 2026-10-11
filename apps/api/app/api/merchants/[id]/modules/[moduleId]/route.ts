import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { withAuthRoles, validateMerchantAccess } from '@rentalshop/auth/server';
import { ApiError, ErrorCode, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { validateAddonDeletion } from '@rentalshop/utils/server';
import { PLATFORM_OPS_ROLES } from '@rentalshop/constants';

const patchSchema = z.object({ removeAtPeriodEnd: z.boolean() });

/**
 * PATCH /api/merchants/[id]/modules/[moduleId]  { removeAtPeriodEnd }
 * Mark an item to end at the next renewal (no refund), or take the mark back. Marking is refused while current
 * usage would exceed the limits without it. Nothing changes mid-period. Authorization: ADMIN, OPS.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> | { id: string; moduleId: string } }
) {
  const resolved = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolved.id);
  const rowId = parseInt(resolved.moduleId);
  return withAuthRoles([...PLATFORM_OPS_ROLES])(async (request, { user, userScope }) => {
    try {
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) return validation.error!;
      const merchantId = validation.merchant?.id ?? merchantPublicId;
      const parsed = patchSchema.safeParse(await request.json());
      if (!parsed.success || Number.isNaN(rowId)) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.success ? {} : parsed.error.flatten()), { status: 400 });
      }
      const row = await db.billingModules.findForMerchant(merchantId, rowId);
      if (!row || !row.isActive) throw new ApiError(ErrorCode.MODULE_NOT_FOUND);

      if (parsed.data.removeAtPeriodEnd && !row.removeAtPeriodEnd) {
        const takeAway = db.billingModules.limitsOfRow(row);
        const check = await validateAddonDeletion(merchantId, takeAway);
        if (!check.isValid && check.exceededLimits) {
          const errorResponse = ResponseBuilder.error('CANNOT_REMOVE_MODULE_LIMIT_EXCEEDED');
          errorResponse.error = {
            message: errorResponse.message,
            exceededLimits: check.exceededLimits,
            currentCounts: check.currentCounts,
            futureLimits: check.futureLimits,
          } as any;
          return NextResponse.json(errorResponse, { status: 422 });
        }
      }
      const module = await db.billingModules.setRemoveAtPeriodEnd(merchantId, rowId, parsed.data.removeAtPeriodEnd);
      return NextResponse.json(ResponseBuilder.success('MERCHANT_MODULE_UPDATED', { module }));
    } catch (error) {
      console.error('Error updating merchant module:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
