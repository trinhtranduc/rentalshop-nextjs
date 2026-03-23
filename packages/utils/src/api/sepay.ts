import { authenticatedFetch, publicFetch, parseApiResponse } from '../core';
import { buildApiUrl } from '../config/api';
import type { ApiResponse } from '../core';

/** Convert plan/subscription amount to integer VND for VietQR (uses rate when currency is not VND). */
export function amountToVndForSepayQr(
  amount: number,
  currency: string | undefined,
  usdVndRate: number
): number {
  const c = (currency || 'USD').toUpperCase();
  if (c === 'VND') return Math.max(1, Math.round(amount));
  const r = Number.isFinite(usdVndRate) && usdVndRate > 0 ? usdVndRate : 25_000;
  return Math.max(1, Math.round(amount * r));
}

export interface SepayPublicConfig {
  vietQrEnabled: boolean;
  usdVndRate: number;
}

export interface SepaySubscriptionTransferQrResponse {
  qrImageUrl: string;
  transferContent: string;
  amountVnd: number;
  bankName: string;
  accountNumber: string;
  accountHolderName?: string;
}

export const sepayApi = {
  async getPublicConfig(): Promise<ApiResponse<SepayPublicConfig>> {
    const response = await publicFetch('api/sepay/config');
    return await parseApiResponse<SepayPublicConfig>(response);
  },

  async createSubscriptionTransferQr(body: {
    amountVnd: number;
    planId?: number;
    merchantId?: number;
  }): Promise<ApiResponse<SepaySubscriptionTransferQrResponse>> {
    const response = await authenticatedFetch(buildApiUrl('api/sepay/subscription-transfer-qr'), {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return await parseApiResponse<SepaySubscriptionTransferQrResponse>(response);
  },
};
