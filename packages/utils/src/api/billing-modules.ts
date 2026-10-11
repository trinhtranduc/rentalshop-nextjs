// ============================================================================
// BILLING MODULES API CLIENT (#782): catalog of add-ons / modules and what a shop bought
// ============================================================================

import { authenticatedFetch, parseApiResponse, type ApiResponse } from '../core';
import { apiUrls } from '../config/api';

export type BillingModuleKind = 'quantity' | 'feature';

export interface BillingModuleLimits {
  outlets?: number;
  users?: number;
  products?: number;
  customers?: number;
  orders?: number;
}

export interface BillingModuleCatalogItem {
  id: number;
  name: string;
  kind: BillingModuleKind;
  featureKey?: string | null;
  limits?: BillingModuleLimits | null;
  monthlyPrice: number;
  currency?: string;
  isActive: boolean;
  sortOrder?: number;
}

export interface BillingModuleCreateInput {
  name: string;
  kind: BillingModuleKind;
  limits?: BillingModuleLimits;
  featureKey?: string;
  monthlyPrice: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface BillingModuleUpdateInput {
  name?: string;
  monthlyPrice?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface MerchantModuleRow {
  id: number;
  name: string;
  kind: BillingModuleKind;
  featureKey?: string | null;
  limits?: BillingModuleLimits | null;
  quantity: number;
  unitPrice: number;
  removeAtPeriodEnd: boolean;
  isActive: boolean;
  endedAt?: string | null;
}

export interface MerchantModulesData {
  modules: MerchantModuleRow[];
  monthlyTotal: number;
  currency: string;
}

export interface MerchantModuleQuote {
  periodDays: number;
  remainingDays: number;
  monthlyPrice: number;
  amountDue: number;
  amountDueRounded: number;
  currency: string;
  quantity: number;
  unitPrice: number;
}

export interface MerchantModuleAddInput {
  moduleId: number;
  quantity: number;
  method: 'TRANSFER' | 'STRIPE';
  transactionId: string;
  reference?: string;
  description?: string;
  paymentDate?: string;
}

const json = (method: string, body: unknown) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const billingModulesApi = {
  async listCatalog(): Promise<ApiResponse<{ modules: BillingModuleCatalogItem[] }>> {
    const response = await authenticatedFetch(apiUrls.billingModules.list);
    return parseApiResponse<{ modules: BillingModuleCatalogItem[] }>(response);
  },

  async createCatalogItem(input: BillingModuleCreateInput): Promise<ApiResponse<{ module: BillingModuleCatalogItem }>> {
    const response = await authenticatedFetch(apiUrls.billingModules.create, json('POST', input));
    return parseApiResponse<{ module: BillingModuleCatalogItem }>(response);
  },

  async updateCatalogItem(id: number, input: BillingModuleUpdateInput): Promise<ApiResponse<{ module: BillingModuleCatalogItem }>> {
    const response = await authenticatedFetch(apiUrls.billingModules.update(id), json('PUT', input));
    return parseApiResponse<{ module: BillingModuleCatalogItem }>(response);
  },

  async listForMerchant(merchantId: number): Promise<ApiResponse<MerchantModulesData>> {
    const response = await authenticatedFetch(apiUrls.billingModules.merchantList(merchantId));
    return parseApiResponse<MerchantModulesData>(response);
  },

  async quote(merchantId: number, moduleId: number, quantity: number): Promise<ApiResponse<MerchantModuleQuote>> {
    const params = new URLSearchParams({ moduleId: String(moduleId), quantity: String(quantity) });
    const response = await authenticatedFetch(`${apiUrls.billingModules.merchantQuote(merchantId)}?${params.toString()}`);
    return parseApiResponse<MerchantModuleQuote>(response);
  },

  async addToMerchant(merchantId: number, input: MerchantModuleAddInput): Promise<ApiResponse<{ module: MerchantModuleRow; payment: unknown; quote: MerchantModuleQuote }>> {
    const response = await authenticatedFetch(apiUrls.billingModules.merchantAdd(merchantId), json('POST', input));
    return parseApiResponse<{ module: MerchantModuleRow; payment: unknown; quote: MerchantModuleQuote }>(response);
  },

  async setRemoveAtPeriodEnd(merchantId: number, rowId: number, removeAtPeriodEnd: boolean): Promise<ApiResponse<{ module: MerchantModuleRow }>> {
    const response = await authenticatedFetch(apiUrls.billingModules.merchantUpdate(merchantId, rowId), json('PATCH', { removeAtPeriodEnd }));
    return parseApiResponse<{ module: MerchantModuleRow }>(response);
  },
};
