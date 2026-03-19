import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuthRoles } from '@rentalshop/auth/server';
import type { UserScope } from '@rentalshop/auth/server';
import type { AuthUser } from '@rentalshop/auth';
import { USER_ROLE, API } from '@rentalshop/constants';
import { env } from '@rentalshop/env';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';

const bodySchema = z.object({
  amountVnd: z.number().int().positive().max(999_999_999_999),
  planId: z.number().int().positive().optional(),
  /** ADMIN-only: target merchant publicId when scope has no merchant */
  merchantId: z.number().int().positive().optional(),
});

function buildSepayQrImageUrl(account: string, bank: string, amountVnd: number, des: string): string {
  const u = new URL('https://qr.sepay.vn/img');
  u.searchParams.set('acc', account);
  u.searchParams.set('bank', bank);
  u.searchParams.set('amount', String(Math.round(amountVnd)));
  u.searchParams.set('des', des.slice(0, 100));
  return u.toString();
}

/**
 * POST /api/sepay/subscription-transfer-qr
 * Returns a SePay VietQR image URL + transfer content for the authenticated merchant.
 */
export const POST = withAuthRoles([USER_ROLE.ADMIN, USER_ROLE.MERCHANT], {
  requireActiveSubscription: false,
})(
  async (request: NextRequest, ctx: { user: AuthUser; userScope: UserScope }) => {
    try {
      const { user, userScope } = ctx;
      const acc = env.SEPAY_VIETQR_ACCOUNT_NUMBER?.trim();
      const bank = env.SEPAY_VIETQR_BANK_NAME?.trim();
      if (!acc || !bank) {
        return NextResponse.json(ResponseBuilder.error('SEPAY_NOT_CONFIGURED'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      const json = await request.json();
      const parsed = bodySchema.safeParse(json);
      if (!parsed.success) {
        return NextResponse.json(ResponseBuilder.validationError(parsed.error.flatten()), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      const { amountVnd, planId } = parsed.data;

      const merchantPublicId =
        user.role === USER_ROLE.ADMIN
          ? parsed.data.merchantId ?? userScope?.merchantId ?? null
          : userScope?.merchantId ?? null;

      if (!merchantPublicId || !Number.isFinite(merchantPublicId)) {
        return NextResponse.json(ResponseBuilder.error('MERCHANT_ID_REQUIRED'), {
          status: API.STATUS.BAD_REQUEST,
        });
      }

      const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
      const transferContent = `SUB${merchantPublicId}P${planId ?? 0}${suffix}`
        .replace(/[^A-Z0-9]/gi, '')
        .slice(0, 50);

      const qrImageUrl = buildSepayQrImageUrl(acc, bank, amountVnd, transferContent);

      return NextResponse.json(
        ResponseBuilder.success('SEPAY_QR_READY', {
          qrImageUrl,
          transferContent,
          amountVnd: Math.round(amountVnd),
          bankName: bank,
          accountNumber: acc,
          accountHolderName: env.SEPAY_VIETQR_ACCOUNT_NAME?.trim() || undefined,
        })
      );
    } catch (error) {
      console.error('sepay/subscription-transfer-qr:', error);
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);
