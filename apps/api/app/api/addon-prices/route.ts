import { NextRequest, NextResponse } from 'next/server';
import { db } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth/server';
import { addonPriceCreateSchema, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';

/**
 * GET /api/addon-prices — the add-on price list (admin: Plans → Add-on prices), with how many shops use each row (#850).
 * ADMIN and OPS read it.
 */
export const GET = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.OPS])(async () => {
  try {
    const addonPrices = await db.addonPrices.list();
    return NextResponse.json(ResponseBuilder.success('ADDON_PRICES_FOUND', { addonPrices }));
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * POST /api/addon-prices — new row: one limit kind + pack size + VND price per pack per month (#850). ADMIN only.
 */
export const POST = withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest) => {
  try {
    const parsed = addonPriceCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), { status: 400 });
    }
    const addonPrice = await db.addonPrices.create(parsed.data);
    return NextResponse.json(ResponseBuilder.success('ADDON_PRICE_CREATED', { addonPrice: { ...addonPrice, shopsUsing: 0 } }), { status: 201 });
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
