import { NextResponse } from 'next/server';
import { env } from '@rentalshop/env';
import { ResponseBuilder } from '@rentalshop/utils';

/**
 * GET /api/sepay/config
 * Public: whether VietQR bank transfer is configured + USD→VND hint for clients.
 */
export async function GET() {
  const enabled = Boolean(
    env.SEPAY_VIETQR_ACCOUNT_NUMBER?.trim() && env.SEPAY_VIETQR_BANK_NAME?.trim()
  );
  const rateRaw = env.SEPAY_USD_VND_RATE?.trim();
  const parsed = rateRaw ? parseFloat(rateRaw) : NaN;
  const usdVndRate = Number.isFinite(parsed) && parsed > 0 ? parsed : 25_000;

  return NextResponse.json(
    ResponseBuilder.success('SEPAY_PUBLIC_CONFIG', {
      vietQrEnabled: enabled,
      usdVndRate,
    })
  );
}
