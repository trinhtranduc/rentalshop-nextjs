import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth/server';
import { USER_ROLE, API } from '@rentalshop/constants';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { syncLoyaltyHistoryForMerchant } from '@/lib/loyalty-sync-history';

/**
 * POST /api/merchants/[id]/loyalty/sync-history
 * Super Admin only: backfill loyalty points/tiers from historical orders.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  const resolvedParams = await Promise.resolve(params);
  const merchantId = parseInt(resolvedParams.id, 10);

  return withAuthRoles([USER_ROLE.ADMIN])(async (_req, { user }) => {
    try {
      if (Number.isNaN(merchantId) || merchantId <= 0) {
        return NextResponse.json(ResponseBuilder.error('INVALID_MERCHANT_ID'), {
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
      console.error('Error syncing merchant loyalty history:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  })(request);
}
