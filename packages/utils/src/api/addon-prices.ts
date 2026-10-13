// ============================================================================
// ADD-ON PRICES API CLIENT (#850): admin price list and a shop's priced add-ons
// ============================================================================

import { authenticatedFetch, parseApiResponse, type ApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { AddonKind, AddonQuote, LimitKind } from '../core/addon-pricing';
import type { RenewalCalculation } from '../core/subscription-billing-calculations';

export interface AddonPriceRow {
  id: number;
  name: string;
  /** #943: `feature` = on/off module row (pack size 1) */
  limitKind: AddonKind;
  /** #943: module key of a feature row (e.g. `attendance`) */
  featureKey?: string | null;
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
  limitKind: AddonKind | null;
  /** #943: module key of a feature item */
  featureKey?: string | null;
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
  /** #870: fewer packs pending for the next period (null = none) */
  nextPacks?: number | null;
  /** #870: packs and pack size of the next period when renewed */
  renewPacks?: number | null;
  renewPackSize?: number | null;
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
  renewal: null | { addonMonthlyTotal: number; addonPaidMonthlyTotal?: number; monthly: RenewalCalculation };
  /** #943: modules still switched on the old way (#907), until the admin adds the feature add-on */
  legacyModules?: Array<{ key: string; enabled: boolean; endDate: string | null; active: boolean }>;
}

export type AddonQuoteData = AddonQuote & {
  packs: number;
  addonPrice: Pick<AddonPriceRow, 'id' | 'name' | 'limitKind' | 'packSize' | 'monthlyPrice' | 'featureKey'>;
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

  async create(data: { name: string; limitKind: AddonKind; featureKey?: string | null; packSize?: number; monthlyPrice: number; isActive?: boolean }): Promise<ApiResponse<{ addonPrice: AddonPriceRow }>> {
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
    data: { addonPriceId: number; packs: number; method?: 'TRANSFER' | 'STRIPE' | 'CASH'; transactionId?: string; reference?: string }
  ): Promise<ApiResponse<{ addon: MerchantAddonItem; payment: unknown; quote: AddonQuote }>> {
    return parseApiResponse(await authenticatedFetch(apiUrls.addonPrices.merchantAdd(merchantId), json('POST', data)));
  },

  /** #870: more packs now (the extra packs are charged now), fewer from the next period (no refund). */
  async setPacks(
    merchantId: number,
    addonId: number,
    data: { packs: number; method?: 'TRANSFER' | 'STRIPE'; transactionId?: string; reference?: string }
  ): Promise<ApiResponse<{ addon: MerchantAddonItem; payment?: unknown; quote?: AddonQuote }>> {
    return parseApiResponse(await authenticatedFetch(apiUrls.addonPrices.merchantUpdate(merchantId, addonId), json('PATCH', data)));
  },

  async setRemoveAtPeriodEnd(merchantId: number, addonId: number, removeAtPeriodEnd: boolean): Promise<ApiResponse<{ addon: MerchantAddonItem }>> {
    return parseApiResponse(await authenticatedFetch(apiUrls.addonPrices.merchantUpdate(merchantId, addonId), json('PATCH', { removeAtPeriodEnd })));
  },
};
