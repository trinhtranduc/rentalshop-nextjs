import { publicPlansApi } from '@rentalshop/utils';
import type { PublicPlanLike } from '../pricing-format';

/**
 * #1147: the public plans for /pricing and /{locale}/pricing, read on the server on every request
 * (publicFetch uses cache: 'no-store', #1119). null when the API fails: the page then shows no amounts or limits.
 */
export async function loadPublicPlans(): Promise<PublicPlanLike[] | null> {
  try {
    const response = await publicPlansApi.getPublicPlansWithVariants();
    return response.success && Array.isArray(response.data) ? response.data : null;
  } catch {
    return null;
  }
}
