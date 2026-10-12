import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { moduleCatalogView } from '../../../../../lib/merchant-modules';

type Params = { params: Promise<{ id: string }> | { id: string } };

/**
 * GET /api/merchants/[id]/modules — #907 rule 4. ADMIN, OPS (read).
 * The module catalog with { key, enabled, endDate (inclusive VN day), active } for one merchant.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const merchantId = Number((await Promise.resolve(params)).id);
  return withAuthRoles(['ADMIN', 'OPS'], { requireActiveSubscription: false })(async () => {
    try {
      if (!Number.isInteger(merchantId) || merchantId <= 0) {
        return NextResponse.json(ResponseBuilder.error('INVALID_MERCHANT_ID'), { status: 400 });
      }
      const merchant = await db.merchants.findById(merchantId);
      if (!merchant) return NextResponse.json(ResponseBuilder.error('MERCHANT_NOT_FOUND'), { status: 404 });
      const rows = await db.merchantModules.listForMerchant(merchantId);
      return NextResponse.json(ResponseBuilder.success('MERCHANT_MODULES_SUCCESS', moduleCatalogView(rows)));
    } catch (error) {
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
