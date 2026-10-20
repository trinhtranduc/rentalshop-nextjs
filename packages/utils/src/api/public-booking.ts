// ============================================================================
// PUBLIC BOOKING API CLIENT (#1124) — the shop page's "Đặt thuê", no login
// ============================================================================

import { getApiBaseUrl } from '../config/api';

export interface PublicBookingResult<T = unknown> {
  success: boolean;
  status: number;
  code: string;
  data?: T;
}

export interface PublicBookingDay {
  date: string;
  status: 'free' | 'full';
}

export interface PublicBookingCreateInput {
  outletId: number;
  pickupDate: string;
  returnDate: string;
  items: Array<{ productId: number; quantity: number }>;
  name: string;
  phone: string;
  note?: string;
  /** Honeypot: always '' from the real form */
  website: string;
}

export interface PublicBookingRequest {
  code: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  shop: { name: string; phone?: string | null };
  outlet: { id: number; name: string; phone: string | null; address: string | null } | null;
  customerName: string;
  customerPhone: string;
  pickupDate: string;
  returnDate: string;
  items: Array<{ productId: number; productName: string; quantity: number; unitPrice: number | null }>;
  orderNumber: string | null;
  rejectReason: string | null;
  rejectNote: string | null;
  expiresAt: string;
  createdAt: string;
}

const shopBase = (tenantKey: string) => `${getApiBaseUrl()}/api/public/${encodeURIComponent(tenantKey)}`;

/**
 * Own small parser instead of `parseApiResponse`: an error answer keeps its `data` (409 names the full day) and
 * no global api-error event fires on a public page. Never through Next's data cache (#1117).
 */
async function call<T>(url: string, init: RequestInit = {}): Promise<PublicBookingResult<T>> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      ...init,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(init.headers as Record<string, string>) },
    });
    const body = await response.json().catch(() => null);
    return {
      success: response.ok && body?.success !== false,
      status: response.status,
      code: body?.code || (response.ok ? 'OK' : 'INTERNAL_SERVER_ERROR'),
      ...(body?.data !== undefined ? { data: body.data as T } : {}),
    };
  } catch {
    return { success: false, status: 0, code: 'NETWORK_ERROR' };
  }
}

export const publicBookingApi = {
  /** Free / full per Vietnam day for one product at one outlet (at most 62 days) */
  availability(tenantKey: string, q: { productId: number; outletId: number; from: string; to: string }) {
    const params = new URLSearchParams({ productId: String(q.productId), outletId: String(q.outletId), from: q.from, to: q.to });
    return call<{ days: PublicBookingDay[] }>(`${shopBase(tenantKey)}/availability?${params.toString()}`);
  },

  /** 201 {code, status, expiresAt}; 409 BOOKING_NOT_AVAILABLE {productId, date}; 429 BOOKING_RATE_LIMITED */
  createRequest(tenantKey: string, body: PublicBookingCreateInput) {
    return call<{ code: string; status: string; expiresAt: string } | { productId: number; date: string }>(
      `${shopBase(tenantKey)}/booking-requests`,
      { method: 'POST', body: JSON.stringify(body) }
    );
  },

  /** Tracking page by the 5-character code */
  getRequest(tenantKey: string, code: string) {
    return call<PublicBookingRequest>(`${shopBase(tenantKey)}/booking-requests/${encodeURIComponent(code.trim().toUpperCase())}`);
  },
};
