import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { addonQuoteQuerySchema, handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { USER_ROLE } from '@rentalshop/constants';
import { checkAddonPurchase, routeId } from '../../../../../../lib/merchant-addons';

/**
 * GET /api/merchants/[id]/addons/quote?addonPriceId&packs — what buying now would charge (#850). Nothing is written.
 * Charge = price × packs × days left ÷ days of the period (Vietnam days; the cycle price for 3/6/12-month periods),
 * whole VND; 0 for a trial shop or an ended period. ADMIN and OPS.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const { id } = await Promise.resolve(params);
  return withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.OPS])(async (request: NextRequest) => {
    try {
      const merchantId = routeId(id);
      const { searchParams } = new URL(request.url);
      const parsed = addonQuoteQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
      if (!merchantId || !parsed.success) {
        return NextResponse.json(ResponseBuilder.error('INVALID_INPUT'), { status: 400 });
      }
      const check = await checkAddonPurchase(merchantId, parsed.data.addonPriceId, parsed.data.packs);
      if (!check.ok) return check.response;
      const { addonPrice, quote } = check;
      return NextResponse.json(
        ResponseBuilder.success('ADDON_QUOTE_READY', {
          ...quote,
          packs: parsed.data.packs,
          addonPrice: { id: addonPrice.id, name: addonPrice.name, limitKind: addonPrice.limitKind, packSize: addonPrice.packSize, monthlyPrice: addonPrice.monthlyPrice },
        })
      );
    } catch (error) {
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
