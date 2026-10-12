/**
 * #884: admin Users page filters in the URL (`merchantId`, `outletId`), so a reload or a shared link keeps them.
 * Pure helpers, no React, so they are unit tested in tests/admin-users-filter.test.ts.
 */
import type { UserFilters } from '@rentalshop/types';

type ParamsLike = { get(name: string): string | null };

function positiveInt(raw: string | null): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n > 0 ? n : undefined;
}

/** Merchant and outlet from the URL. An outlet only counts once a merchant is chosen. */
export function readUserListFilters(params: ParamsLike): { merchantId?: number; outletId?: number } {
  const merchantId = positiveInt(params.get('merchantId'));
  const outletId = merchantId ? positiveInt(params.get('outletId')) : undefined;
  return { merchantId, outletId };
}

/**
 * URL updates for a filter change. Any change goes back to page 1; a new merchant drops the outlet.
 * The shared role select sends the whole filters object, so a merchant counts as changed only when it differs
 * from `current`.
 */
export function userFilterUrlUpdates(
  change: Partial<UserFilters>,
  current: { merchantId?: number; outletId?: number } = {}
): Record<string, string | number | undefined> {
  const updates: Record<string, string | number | undefined> = { page: 1 };
  if ('role' in change) updates.role = change.role || undefined;
  if ('status' in change) updates.status = change.status || undefined;
  if ('merchantId' in change && (change.merchantId || undefined) !== current.merchantId) {
    updates.merchantId = change.merchantId ? String(change.merchantId) : undefined;
    updates.outletId = undefined;
  } else if ('outletId' in change && (change.outletId || undefined) !== current.outletId) {
    updates.outletId = change.outletId ? String(change.outletId) : undefined;
  }
  return updates;
}
