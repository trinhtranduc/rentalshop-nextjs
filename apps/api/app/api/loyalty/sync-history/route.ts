import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { USER_ROLE, API } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { syncLoyaltyHistoryForMerchant } from '@/lib/loyalty-sync-history';

/**
 * POST /api/loyalty/sync-history?merchantId=
 * Super Admin only. Prefer POST /api/merchants/[id]/loyalty/sync-history.
 */
export const POST = withAuthRoles([USER_ROLE.ADMIN])(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url);
    const merchantId = parseInt(searchParams.get('merchantId') || '', 10);
    if (Number.isNaN(merchantId) || merchantId <= 0) {
      return NextResponse.json(ResponseBuilder.error('MERCHANT_ID_REQUIRED'), {
        status: API.STATUS.BAD_REQUEST,
      });
    }

    const result = await syncLoyaltyHistoryForMerchant(merchantId, user.id);
    return NextResponse.json(ResponseBuilder.success('SYNC_HISTORY_SUCCESS', result));
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'LOYALTY_PROGRAM_NOT_FOUND') {
        return NextResponse.json(ResponseBuilder.error('LOYALTY_PROGRAM_NOT_FOUND'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }
      if (error.message === 'LOYALTY_PROGRAM_INACTIVE') {
        return NextResponse.json(ResponseBuilder.error('LOYALTY_PROGRAM_INACTIVE'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }
    }
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
