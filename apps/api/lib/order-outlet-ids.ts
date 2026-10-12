import { USER_ROLE } from '@rentalshop/constants';
import { narrowAnalyticsOutletFilter } from './analytics-outlets';

type MerchantOutletIds = { outletOperations: { merchantOutletIds: (merchantId: number) => Promise<number[]> } };

export type OrderOutletNarrowing =
  | { ok: true; outletIds: number[] | null }
  | { ok: false; status: 400 | 403; code: 'INVALID_QUERY' | 'CROSS_MERCHANT_ACCESS_DENIED' };

/**
 * #852: optional `outletIds=1,3` on GET /api/orders and /api/orders/export. A MERCHANT narrows the list to
 * some of its own outlets (any other id → 403 `CROSS_MERCHANT_ACCESS_DENIED`, malformed → 400 `INVALID_QUERY`).
 * Other roles, or no param: `outletIds: null` (the route's scope as before).
 */
export async function narrowOrderOutlets(
  db: MerchantOutletIds,
  role: string | undefined,
  merchantId: number | undefined,
  raw: string | null | undefined
): Promise<OrderOutletNarrowing> {
  if (!raw || role !== USER_ROLE.MERCHANT || !merchantId) return { ok: true, outletIds: null };
  const own = await db.outletOperations.merchantOutletIds(merchantId);
  const narrowed = narrowAnalyticsOutletFilter({ outletId: { in: own } }, role, raw);
  if (!narrowed.ok) return narrowed;
  return { ok: true, outletIds: narrowed.outletIds };
}
