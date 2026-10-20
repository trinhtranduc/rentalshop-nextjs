// ============================================================================
// PUBLIC IMAGE SEARCH API CLIENT (#1128) — "Tìm bằng ảnh" on the shop page, no login
// ============================================================================

import { getApiBaseUrl } from '../config/api';

export interface PublicImageSearchProduct {
  id: number;
  name: string;
  images: string[];
  rentPrice: number;
  salePrice: number | null;
  deposit: number;
  pricingType: string | null;
  pricingOptions: Array<{ type: string; price: number; unit: string | null; blockSize: number | null; isDefault: boolean }>;
  categoryId?: number;
  category: { id: number; name: string } | null;
  totalStock?: number;
  available?: number;
  similarity: number;
  [key: string]: unknown;
}

export interface PublicImageSearchResult {
  success: boolean;
  status: number;
  code: string;
  data?: { products: PublicImageSearchProduct[]; total: number };
}

/** 200 PRODUCTS_FOUND / NO_PRODUCTS_FOUND; 429 IMAGE_SEARCH_RATE_LIMITED; 503 SEARCH_TIMEOUT / SEARCH_FAILED */
export const publicImageSearchApi = {
  async search(tenantKey: string, image: Blob, fileName = 'photo.jpg'): Promise<PublicImageSearchResult> {
    const form = new FormData();
    form.append('image', image, fileName);
    try {
      // No Content-Type header: the browser sets the multipart boundary. Never through Next's data cache (#1117).
      const response = await fetch(`${getApiBaseUrl()}/api/public/${encodeURIComponent(tenantKey)}/search-by-image`, {
        method: 'POST',
        body: form,
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      const body = await response.json().catch(() => null);
      return {
        success: response.ok && body?.success !== false,
        status: response.status,
        code: body?.code || (response.ok ? 'OK' : 'INTERNAL_SERVER_ERROR'),
        ...(body?.data !== undefined ? { data: body.data } : {}),
      };
    } catch {
      return { success: false, status: 0, code: 'NETWORK_ERROR' };
    }
  },
};
