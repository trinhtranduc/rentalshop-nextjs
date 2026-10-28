// ============================================================================
// BOOKING REQUESTS API CLIENT (#1124) — the shop's "Đặt online" (requests from the public shop page)
// ============================================================================

import { authenticatedFetch, parseApiResponse } from '../core';
import { apiUrls } from '../config/api';

export type BookingRequestStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';

export interface ShopBookingRequest {
  id: number;
  code: string;
  status: BookingRequestStatus;
  customerName: string;
  customerPhone: string;
  note: string | null;
  outlet: { id: number; name: string | null };
  pickupDate: string;
  returnDate: string;
  pickupPlanAt: string;
  returnPlanAt: string;
  itemCount: number;
  items: Array<{ productId: number; productName: string; quantity: number; unitPrice: number | null; shortDay?: string | null }>;
  orderId: number | null;
  rejectReason: string | null;
  rejectNote: string | null;
  expiresAt: string;
  createdAt: string;
  customer?: { id: number; firstName: string; lastName: string | null; phone: string | null } | null;
}

export interface ShopBookingList {
  requests: ShopBookingRequest[];
  counts: Record<BookingRequestStatus, number>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface BookingPrepared {
  bookingRequestId: number;
  orderType: 'RENT';
  outletId: number;
  customer: { id: number; firstName: string; lastName: string | null; phone: string | null } | null;
  customerCreated: boolean;
  pickupPlanAt: string;
  returnPlanAt: string;
  notes: string | null;
  items: Array<{ productId: number; quantity: number; productName: string }>;
}

export const bookingRequestsApi = {
  async list(filters: { status?: BookingRequestStatus; outletId?: number; page?: number; limit?: number } = {}) {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.outletId) params.set('outletId', String(filters.outletId));
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    const q = params.toString();
    const response = await authenticatedFetch(q ? `${apiUrls.bookingRequests.list}?${q}` : apiUrls.bookingRequests.list);
    return parseApiResponse<ShopBookingList>(response);
  },

  async get(id: number) {
    const response = await authenticatedFetch(apiUrls.bookingRequests.get(id));
    return parseApiResponse<ShopBookingRequest>(response);
  },

  /** "Xác nhận": customer by phone (created when new) + what the cart needs; creates no order */
  async prepare(id: number) {
    const response = await authenticatedFetch(apiUrls.bookingRequests.prepare(id), { method: 'POST', body: JSON.stringify({}) });
    return parseApiResponse<BookingPrepared>(response);
  },

  async reject(id: number, body: { reason: 'OUT_OF_STOCK' | 'CANNOT_CONTACT' | 'OTHER'; note?: string }) {
    const response = await authenticatedFetch(apiUrls.bookingRequests.reject(id), { method: 'POST', body: JSON.stringify(body) });
    return parseApiResponse<{ id: number; code: string; status: BookingRequestStatus }>(response);
  },

  /** Settings › "Nhận đặt online" for the whole shop (owner only) */
  async setOnlineBooking(enabled: boolean) {
    const response = await authenticatedFetch(apiUrls.settings.merchant, {
      method: 'PUT',
      body: JSON.stringify({ onlineBookingEnabled: enabled }),
    });
    return parseApiResponse<{ onlineBookingEnabled?: boolean }>(response);
  },

  /** Settings › "Hiện giá trên trang shop" (owner only, #1174) */
  async setShowPublicPrice(enabled: boolean) {
    const response = await authenticatedFetch(apiUrls.settings.merchant, {
      method: 'PUT',
      body: JSON.stringify({ showPublicPrice: enabled }),
    });
    return parseApiResponse<{ showPublicPrice?: boolean }>(response);
  },

  /** Settings › "Với app cũ" for day-block prices (owner only, #1189): 'recompute' | 'block' */
  async setBlockPricingOldApps(oldApps: 'recompute' | 'block') {
    const response = await authenticatedFetch(apiUrls.settings.merchant, {
      method: 'PUT',
      body: JSON.stringify({ blockPricing: { oldApps } }),
    });
    return parseApiResponse<{ blockPricing?: { oldApps?: string } }>(response);
  },
};
