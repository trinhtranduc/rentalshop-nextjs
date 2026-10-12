import { authenticatedFetch, parseApiResponse } from '../core';
import { getApiBaseUrl } from '../config/api';
import type { ApiResponse } from '../core';

/**
 * #907 Feature modules of a merchant (admin). ADMIN reads and switches; OPS reads only.
 * `endDate` is an inclusive VN day `YYYY-MM-DD` (null = no end).
 */
export interface MerchantModuleView {
  key: string;
  enabled: boolean;
  endDate: string | null;
  active: boolean;
}

const modulesUrl = (merchantId: number) => `${getApiBaseUrl()}/api/merchants/${merchantId}/modules`;

export const merchantModulesApi = {
  async list(merchantId: number): Promise<ApiResponse<MerchantModuleView[]>> {
    const response = await authenticatedFetch(modulesUrl(merchantId));
    return await parseApiResponse(response);
  },

  async update(
    merchantId: number,
    key: string,
    body: { enabled: boolean; endDate?: string | null }
  ): Promise<ApiResponse<MerchantModuleView>> {
    const response = await authenticatedFetch(`${modulesUrl(merchantId)}/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return await parseApiResponse(response);
  },
};
