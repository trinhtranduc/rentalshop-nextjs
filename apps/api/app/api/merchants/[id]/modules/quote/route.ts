import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { withAuthRoles, validateMerchantAccess } from '@rentalshop/auth/server';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { PLATFORM_OPS_ROLES } from '@rentalshop/constants';

const querySchema = z.object({
  moduleId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(100000).default(1),
});

/**
 * GET /api/merchants/[id]/modules/quote?moduleId=&quantity=
 * What adding the item now costs: price × quantity × remaining Vietnam days / days of the period. Writes nothing.
 * Authorization: ADMIN, OPS.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolved = await Promise.resolve(params);
  const merchantPublicId = parseInt(resolved.id);
  return withAuthRoles([...PLATFORM_OPS_ROLES])(async (request, { user, userScope }) => {
    try {
      const validation = await validateMerchantAccess(merchantPublicId, user, userScope);
      if (!validation.valid) return validation.error!;
      const merchantId = validation.merchant?.id ?? merchantPublicId;
      const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }
      const quote = await db.billingModules.quoteForMerchant(merchantId, parsed.data.moduleId, parsed.data.quantity);
      return NextResponse.json(ResponseBuilder.success('MODULE_QUOTE', quote));
    } catch (error) {
      console.error('Error quoting merchant module:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
