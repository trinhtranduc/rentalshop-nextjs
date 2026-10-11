import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import { addonPriceUpdateSchema, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * PUT /api/addon-prices/[id] — change the name, the price, on sale / paused ("Tạm tắt") or the order (#850). ADMIN only.
 * A new price applies to new purchases and later renewals; bought items keep their captured price.
 * The pack size changes only while no shop holds an item of the row (else 422 ADDON_PRICE_IN_USE); the kind never.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id: rawId } = await Promise.resolve(params);
  return withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest) => {
    try {
      const id = Number(rawId);
      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      }
      const parsed = addonPriceUpdateSchema.safeParse(await request.json());
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
      }
      const existing = await db.addonPrices.findById(id);
      if (!existing) {
        return NextResponse.json(ResponseBuilder.error('ADDON_PRICE_NOT_FOUND'), { status: 404 });
      }
      const changes = { ...parsed.data };
      if (changes.packSize !== undefined && changes.packSize !== existing.packSize) {
        if ((await db.addonPrices.countShopsUsing(id)) > 0) {
          return NextResponse.json(ResponseBuilder.error('ADDON_PRICE_IN_USE'), { status: 422 });
        }
      } else {
        delete changes.packSize;
      }
      const addonPrice = await db.addonPrices.update(id, changes);
      return NextResponse.json(ResponseBuilder.success('ADDON_PRICE_UPDATED', { addonPrice }));
    } catch (error) {
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
