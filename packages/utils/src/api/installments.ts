import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';
import type { ApiResponse } from '../core';
import type { DepositMode, DepositTemplate } from '../core/deposit-plan';

// ============================================================================
// Deposit stages (#1199 "Thu cọc theo giai đoạn")
// ============================================================================

/** GET / PUT /api/settings/deposit */
export interface DepositSettings {
  depositMode: DepositMode;
  cancellationPolicy: string;
  templates: DepositTemplate[];
  /** Built-in template used while a STAGED shop has none of its own */
  defaultTemplate: DepositTemplate;
}

export interface DepositSettingsUpdate {
  depositMode?: DepositMode;
  cancellationPolicy?: string;
  templates?: DepositTemplate[];
}

/** One stage of `installments[]` in an order response (client declares `installments`) */
export interface OrderInstallment {
  key: string;
  label: string;
  percent: number;
  amount: number;
  plannedAmount: number;
  remaining: number;
  dueDateKey: string | null;
  status: 'PAID' | 'PARTIAL' | 'DUE_TODAY' | 'OVERDUE' | 'UPCOMING' | 'VOID';
  collectedAt: string | null;
  paidAmount: number;
}

export interface CollectInstallmentInput {
  amount: number;
  method: 'CASH' | 'TRANSFER' | 'CHECK' | 'MANUAL';
  /** Shop civil day `YYYY-MM-DD`; today when missing */
  collectedOn?: string;
  note?: string;
  /** 8-100 chars, the same value on a retry so the server collects once */
  reference: string;
}

/** Stage sent when the MERCHANT / OUTLET_ADMIN edits the plan of one order (`rest` is never sent) */
export interface DepositPlanItemInput {
  key?: string;
  label: string;
  type: 'PERCENT';
  value: number;
  dueRule?: { kind: 'ON_CREATE' } | { kind: 'BEFORE_PICKUP'; days: number } | { kind: 'AFTER_CREATE'; days: number };
  dueDateKey?: string;
  amountOverride?: number;
}

export const installmentsApi = {
  async getDepositSettings(): Promise<ApiResponse<DepositSettings>> {
    const response = await authenticatedFetch(apiUrls.settings.deposit);
    return parseApiResponse<DepositSettings>(response);
  },

  /** MERCHANT only (403 for every other role) */
  async updateDepositSettings(data: DepositSettingsUpdate): Promise<ApiResponse<DepositSettings>> {
    const response = await authenticatedFetch(apiUrls.settings.deposit, { method: 'PUT', body: JSON.stringify(data) });
    return parseApiResponse<DepositSettings>(response);
  },

  async collect(orderId: number, key: string, input: CollectInstallmentInput): Promise<ApiResponse<Record<string, unknown>>> {
    const response = await authenticatedFetch(`${apiUrls.orders.update(orderId)}/installments/${encodeURIComponent(key)}/collect`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return parseApiResponse<Record<string, unknown>>(response);
  },

  /** MERCHANT / ADMIN: the collected payment of a stage is cancelled (a wrong collection) */
  async voidStage(orderId: number, key: string, note?: string): Promise<ApiResponse<Record<string, unknown>>> {
    const response = await authenticatedFetch(`${apiUrls.orders.update(orderId)}/installments/${encodeURIComponent(key)}/void`, {
      method: 'POST',
      body: JSON.stringify(note ? { note } : {}),
    });
    return parseApiResponse<Record<string, unknown>>(response);
  },

  /** MERCHANT / OUTLET_ADMIN / ADMIN */
  async editPlan(orderId: number, items: DepositPlanItemInput[], policy?: string): Promise<ApiResponse<Record<string, unknown>>> {
    const response = await authenticatedFetch(`${apiUrls.orders.update(orderId)}/deposit-plan`, {
      method: 'PUT',
      body: JSON.stringify(policy === undefined ? { items } : { items, policy }),
    });
    return parseApiResponse<Record<string, unknown>>(response);
  },

  /**
   * Cancel an order. `keptAmount` (0 ≤ kept ≤ collected) is what the shop keeps; only MERCHANT / OUTLET_ADMIN / ADMIN
   * choose it, the server refunds the rest (part B of #1199). Without it the server refunds everything.
   */
  async cancelOrderWithKept(orderId: number, keptAmount?: number, note?: string): Promise<ApiResponse<Record<string, unknown>>> {
    const body: Record<string, unknown> = { status: 'CANCELLED' };
    if (keptAmount !== undefined) body.cancelKeptAmount = keptAmount;
    if (note) body.cancelNote = note;
    const response = await authenticatedFetch(apiUrls.orders.updateStatus(orderId), { method: 'PATCH', body: JSON.stringify(body) });
    return parseApiResponse<Record<string, unknown>>(response);
  },
};
