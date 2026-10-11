import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import { ApiError, ErrorCode, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { PLATFORM_OPS_ROLES } from '@rentalshop/constants';

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    monthlyPrice: z.coerce.number().min(0).max(1_000_000_000).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(10000).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

/**
 * PUT /api/billing-modules/[id]
 * Name, price, order and visibility. A price change applies to new purchases and to the next renewal only.
 * Authorization: ADMIN, OPS.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolved = await Promise.resolve(params);
  const id = parseInt(resolved.id);
  return withAuthRoles([...PLATFORM_OPS_ROLES])(async (request) => {
    try {
      if (Number.isNaN(id)) throw new ApiError(ErrorCode.MODULE_NOT_FOUND);
      const parsed = updateSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }
      if (!(await db.billingModules.findCatalogItem(id))) throw new ApiError(ErrorCode.MODULE_NOT_FOUND);
      const module = await db.billingModules.updateCatalogItem(id, parsed.data);
      return NextResponse.json(ResponseBuilder.success('BILLING_MODULE_UPDATED', { module }));
    } catch (error) {
      console.error('Error updating billing module:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
