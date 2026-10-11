import { USER_ROLE } from '@rentalshop/constants';

/** Prisma `where` part with the role's outlet scope, e.g. `{}`, `{ outletId: 3 }`, `{ outletId: { in: [1, 2] } }` */
export type OutletFilter = Record<string, unknown>;

export type AnalyticsOutletNarrowing =
  | { ok: true; filter: OutletFilter | null; outletIds: number[] | null }
  | { ok: false; status: 400 | 403; code: 'INVALID_QUERY' | 'CROSS_MERCHANT_ACCESS_DENIED' };

const OUTLET_IDS_RE = /^[1-9]\d*(,[1-9]\d*)*$/;

/** Outlet ids an outlet filter covers: `{ outletId: 3 }` → [3], `{ outletId: { in: [...] } }` → the list, else null */
function outletIdsOfFilter(filter: OutletFilter | null): number[] | null {
  const value = filter?.outletId as number | { in?: unknown } | undefined;
  if (typeof value === 'number') return [value];
  if (value && Array.isArray(value.in)) return value.in.map(Number);
  return null;
}

/**
 * #827: optional `outletIds=1,3` on the analytics routes. `base` is the role scope from
 * `resolveAnalyticsOutletFilter` (or the same shape built by a route). A MERCHANT narrows it to some of its own
 * outlets (403 `CROSS_MERCHANT_ACCESS_DENIED` for any other id, 400 `INVALID_QUERY` for a malformed list).
 * Outlet roles and ADMIN ignore the param. No param (or empty) = the scope as it was.
 * `outletIds` = the outlets the result covers (null when unknown, e.g. ADMIN without a merchant).
 */
export function narrowAnalyticsOutletFilter(
  base: OutletFilter | null,
  role: string | undefined,
  raw: string | null | undefined
): AnalyticsOutletNarrowing {
  if (base === null) return { ok: true, filter: null, outletIds: null };
  const inScope = outletIdsOfFilter(base);
  if (!raw || role !== USER_ROLE.MERCHANT) return { ok: true, filter: base, outletIds: inScope };
  if (!OUTLET_IDS_RE.test(raw)) return { ok: false, status: 400, code: 'INVALID_QUERY' };
  const requested = [...new Set(raw.split(',').map(Number))];
  const allowed = new Set(inScope ?? []);
  if (requested.some((id) => !allowed.has(id))) {
    return { ok: false, status: 403, code: 'CROSS_MERCHANT_ACCESS_DENIED' };
  }
  return { ok: true, filter: { ...base, outletId: { in: requested } }, outletIds: requested };
}
