// ============================================================================
// ADD-ON PRICES API CLIENT (#850): admin price list and a shop's priced add-ons
// ============================================================================

import { authenticatedFetch, parseApiResponse, type ApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { AddonQuote, LimitKind } from '../core/addon-pricing';
import type { RenewalCalculation } from '../core/subscription-billing-calculations';

export interface AddonPriceRow {
  id: number;
  name: string;
  limitKind: LimitKind;
  packSize: number;
  monthlyPrice: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  shopsUsing: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MerchantAddonItem {
  id: number;
  merchantId: number;
  addonPriceId: number | null;
  name: string | null;
  limitKind: LimitKind | null;
  packSize: number | null;
  packs: number | null;
  unitPrice: number | null;
  outlets: number;
  users: number;
  products: number;
  customers: number;
  orders: number;
  notes: string | null;
  removeAtPeriodEnd: boolean;
  endsAt: string | null;
  createdAt: string;
  legacy: boolean;
  monthlyAmount: number;
  renews: boolean;
  renewUnitPrice: number | null;
  renewMonthlyAmount: number;
}

type Limits = Record<LimitKind, number>;

export interface MerchantAddonsData {
  merchant: { id: number; name: string };
  subscription: null | {
    id: number;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    interval: string;
    intervalCount: number;
    plan: { id: number; name: string; basePrice: number } | null;
  };
  multiBranchPlan: boolean;
  addons: MerchantAddonItem[];
  monthlyTotal: number;
  limits: null | { plan: Limits; addons: Limits; total: Limits; usage: Limits };
  renewal: null | { addonMonthlyTotal: number; monthly: RenewalCalculation };
}

export type AddonQuoteData = AddonQuote & {
  packs: number;
  addonPrice: Pick<AddonPriceRow, 'id' | 'name' | 'limitKind' | 'packSize' | 'monthlyPrice'>;
};

const json = (method: string, body: unknown) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const addonPricesApi = {
  async list(): Promise<ApiResponse<{ addonPrices: AddonPriceRow[] }>> {
    return parseApiResponse(await authenticatedFetch(apiUrls.addonPrices.list));
  },

  async create(data: { name: string; limitKind: LimitKind; packSize: number; monthlyPrice: number; isActive?: boolean }): Promise<ApiResponse<{ addonPrice: AddonPriceRow }>> {
    return parseApiResponse(await authenticatedFetch(apiUrls.addonPrices.create, json('POST', data)));
  },

  async update(id: number, data: Partial<Pick<AddonPriceRow, 'name' | 'packSize' | 'monthlyPrice' | 'isActive' | 'sortOrder'>>): Promise<ApiResponse<{ addonPrice: AddonPriceRow }>> {
    return parseApiResponse(await authenticatedFetch(apiUrls.addonPrices.update(id), json('PUT', data)));
  },

  async listForMerchant(merchantId: number): Promise<ApiResponse<MerchantAddonsData>> {
    return parseApiResponse(await authenticatedFetch(apiUrls.addonPrices.merchantList(merchantId)));
  },

  async quote(merchantId: number, addonPriceId: number, packs: number): Promise<ApiResponse<AddonQuoteData>> {
    const params = new URLSearchParams({ addonPriceId: String(addonPriceId), packs: String(packs) });
    return parseApiResponse(await authenticatedFetch(`${apiUrls.addonPrices.merchantQuote(merchantId)}?${params.toString()}`));
  },

  async addToMerchant(
    merchantId: number,
    data: { addonPriceId: number; packs: number; method?: 'TRANSFER' | 'STRIPE'; transactionId?: string; reference?: string }
  ): Promise<ApiResponse<{ addon: MerchantAddonItem; payment: unknown; quote: AddonQuote }>> {
    return parseApiResponse(await authenticatedFetch(apiUrls.addonPrices.merchantAdd(merchantId), json('POST', data)));
  },

  async setRemoveAtPeriodEnd(merchantId: number, addonId: number, removeAtPeriodEnd: boolean): Promise<ApiResponse<{ addon: MerchantAddonItem }>> {
    return parseApiResponse(await authenticatedFetch(apiUrls.addonPrices.merchantUpdate(merchantId, addonId), json('PATCH', { removeAtPeriodEnd })));
  },
};
