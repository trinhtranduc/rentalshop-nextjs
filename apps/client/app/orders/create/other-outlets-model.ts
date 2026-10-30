/**
 * "Chi nhánh khác còn N" in the create-order cart (#1347, #1335). Pure, so the screen and the tests share one rule.
 *
 * A cart line that is short at the order's branch asks `POST /api/products/other-outlets-availability` which other
 * branches still have the product on the order's days. Only a hint to tell the customer: one order is one branch.
 * The API refuses OUTLET_STAFF (403); the page does not even ask for them, so they see "Hết hàng" only.
 */
import { dayRangeIso, type OrderType } from './create-model';

export interface OtherOutlet {
  outletId: number;
  outletName: string;
  available: number;
}

/** Owner, manager and stock keeper (same list as the API's `canSeeOtherOutlets`, minus the system ADMIN who has no cart). */
const ASKING_ROLES = ['MERCHANT', 'OUTLET_ADMIN', 'OUTLET_INVENTORY'];

export function canAskOtherOutlets(role: string | null | undefined): boolean {
  return ASKING_ROLES.includes((role ?? '').toUpperCase());
}

/**
 * Whether the cart asks at all. An owner who is not tied to a branch has the shop's branch list on the page, so a
 * one-branch shop never asks. Anyone tied to a branch (manager, stock keeper, an owner account with a branch) only
 * knows that branch: the API answers an empty list for a one-branch shop and the cart shows nothing.
 */
export function asksOtherOutlets(role: string | null | undefined, outletCount: number, tiedToBranch: boolean): boolean {
  if (!canAskOtherOutlets(role)) return false;
  return (role ?? '').toUpperCase() === 'MERCHANT' && !tiedToBranch ? outletCount > 1 : true;
}

/** Product ids whose cart line is short or in conflict at the order's branch: once each, ascending. */
export function shortProductIds(lines: Array<{ productId: number }>, kindOf: (productId: number) => 'conflict' | 'short' | 'ok' | null): number[] {
  const ids = new Set<number>();
  for (const l of lines) {
    const kind = kindOf(l.productId);
    if (kind === 'conflict' || kind === 'short') ids.add(l.productId);
  }
  return Array.from(ids).sort((a, b) => a - b);
}

interface RequestInput {
  productIds: number[];
  orderType: OrderType;
  pickup: string;
  ret: string;
  outletId: number | null;
}

/** The body for the API, or null when there is nothing to ask (no products, no branch, a rental without days). */
export function otherOutletsRequest(input: RequestInput) {
  if (!input.productIds.length || !input.outletId) return null;
  const products = input.productIds.map((productId) => ({ productId, quantity: 1 }));
  if (input.orderType === 'SALE') return { products, orderType: 'SALE' as const, outletId: input.outletId };
  if (!input.pickup || !input.ret) return null;
  return { products, orderType: 'RENT' as const, ...dayRangeIso(input.pickup, input.ret), outletId: input.outletId };
}

/** Identifies one question; '' when there is nothing to ask. An answer for another key no longer applies. */
export function otherOutletsKey(input: RequestInput): string {
  if (!otherOutletsRequest(input)) return '';
  return [input.orderType, input.pickup, input.ret, input.outletId, input.productIds.join(',')].join('|');
}

/** "Quận 7 (3), Thủ Đức (1)", in the order the API sends them (most units first). */
export function otherOutletsText(list: OtherOutlet[] | null | undefined): string {
  return (list || []).map((o) => `${o.outletName} (${o.available})`).join(', ');
}
